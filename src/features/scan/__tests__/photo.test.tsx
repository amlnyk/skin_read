import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t, type MessageKey } from '@/i18n';
import type { LabelReaderErrorCode } from '@/lib/ports';
import { err } from '@/lib/result';
import { APP_NOW, renderApp } from '@/test/helpers/appHarness';
import {
  createFakeImageDeps,
  createFakeLabelReader,
  createMemoryPhotoStore,
  readingOk,
  type FakeLabelReader,
} from '@/test/helpers/fakes';
import { PERSONAS } from '@/test/data/personas';

afterEach(cleanup);

const picture = (type = 'image/jpeg') => new File([new Uint8Array(20)], 'label.jpg', { type });

type OpenOptions = {
  reader?: FakeLabelReader;
  photoScan?: boolean;
  granted?: boolean;
  imageDeps?: ReturnType<typeof createFakeImageDeps>;
};

function open(path = '/scan/photo', options: OpenOptions = {}) {
  const reader = options.reader ?? createFakeLabelReader(readingOk());
  const photos = createMemoryPhotoStore();
  const view = renderApp(path, {
    persona: PERSONAS.T2,
    now: APP_NOW,
    ...(options.granted
      ? { settings: { consents: { photoToAi: { granted: true, at: '2026-01-01T10:00:00.000Z' } } } }
      : {}),
    services: {
      labelReader: reader,
      photos,
      features: { photoScan: options.photoScan ?? true },
      ...(options.imageDeps ? { imageDeps: options.imageDeps } : {}),
    },
  });
  return { ...view, reader, photos };
}

async function take(label: MessageKey = 'scan.photoCamera', file = picture()) {
  const input = await screen.findByLabelText(t(label));
  fireEvent.change(input, { target: { files: [file] } });
}

const recognize = () =>
  fireEvent.click(screen.getByRole('button', { name: t('scan.photoRecognize') }));

describe('the entrance of the scanner', () => {
  it('with the photo switched on there is a link to the photo screen and one to typing by hand', async () => {
    open('/scan');
    expect(await screen.findByRole('link', { name: t('scan.photoLink') })).toHaveAttribute(
      'href',
      '/scan/photo',
    );
    expect(screen.getByRole('link', { name: t('scan.manualLink') })).toHaveAttribute(
      'href',
      '/care/products/new',
    );
    expect(screen.getByRole('link', { name: t('scan.pasteLink') })).toBeInTheDocument();
  });

  it('with the photo switched off the old announcement stays and nothing links to the photo screen', async () => {
    open('/scan', { photoScan: false });
    expect(
      await screen.findByRole('button', { name: new RegExp(t('scan.photoSoon')) }),
    ).toBeDisabled();
    expect(screen.queryByRole('link', { name: t('scan.photoLink') })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('scan.manualLink') })).toBeInTheDocument();
  });
});

describe('the photo screen', () => {
  it('switched off: says it comes later and offers pasting', async () => {
    open('/scan/photo', { photoScan: false });
    expect(await screen.findByText(t('scan.photoSoon'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('scan.pasteLink') })).toBeInTheDocument();
    expect(screen.queryByLabelText(t('scan.photoCamera'))).not.toBeInTheDocument();
  });

  it('gives the tips and two ways to take a photo: the camera and the gallery', async () => {
    open();
    expect(await screen.findByRole('heading', { name: t('scan.photoTitle') })).toBeInTheDocument();
    for (const tip of ['scan.tipClose', 'scan.tipLight', 'scan.tipOnlyList'] as const) {
      expect(screen.getByText(t(tip))).toBeInTheDocument();
    }
    expect(screen.getByLabelText(t('scan.photoCamera'))).toHaveAttribute('capture', 'environment');
    const gallery = screen.getByLabelText(t('scan.photoGallery'));
    expect(gallery).not.toHaveAttribute('capture');
    expect(gallery).toHaveAttribute('accept', 'image/*');
  });

  it('a chosen photo is shown first; nothing is sent until the button is pressed', async () => {
    const { reader } = open();
    await take();
    expect(await screen.findByRole('img', { name: t('scan.photoPreviewAlt') })).toBeInTheDocument();
    expect(reader.calls).toHaveLength(0);
  });

  it('the photo from the gallery works the same way', async () => {
    open();
    await take('scan.photoGallery');
    expect(
      await screen.findByRole('button', { name: t('scan.photoRecognize') }),
    ).toBeInTheDocument();
  });

  it('the picture is shrunk before it can be sent', async () => {
    const deps = createFakeImageDeps({ width: 4000, height: 3000 });
    const { reader } = open('/scan/photo', { imageDeps: deps, granted: true });
    await take();
    await screen.findByRole('img', { name: t('scan.photoPreviewAlt') });
    recognize();
    await waitFor(() => expect(reader.calls).toHaveLength(1));
    expect(deps.encoded[0]).toMatchObject({ width: 1600, height: 1200 });
    expect(reader.calls[0]?.type).toBe('image/jpeg');
  });
});

describe('the consent comes before the first photo is sent', () => {
  it('asks first and sends nothing while the question is open', async () => {
    const { reader, store } = open();
    await take();
    await screen.findByRole('img', { name: t('scan.photoPreviewAlt') });
    recognize();
    const dialog = await screen.findByRole('dialog', { name: t('scan.consentTitle') });
    expect(within(dialog).getByText(t('scan.consentText'))).toBeInTheDocument();
    expect(reader.calls).toHaveLength(0);
    expect(store.getState().settings.consents.photoToAi.granted).toBe(false);
  });

  it('"No, type it by hand": nothing is sent, nothing is saved, the paste screen opens', async () => {
    const { reader, store, router } = open();
    await take();
    await screen.findByRole('img', { name: t('scan.photoPreviewAlt') });
    recognize();
    fireEvent.click(await screen.findByRole('button', { name: t('scan.consentNo') }));
    expect(router.state.location.pathname).toBe('/scan/paste');
    expect(reader.calls).toHaveLength(0);
    expect(store.getState().settings.consents.photoToAi.granted).toBe(false);
  });

  it('"I agree": the consent is saved with the date and the photo is read', async () => {
    const { reader, store, router } = open();
    await take();
    await screen.findByRole('img', { name: t('scan.photoPreviewAlt') });
    recognize();
    fireEvent.click(await screen.findByRole('button', { name: t('scan.consentYes') }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/scan/review'));
    expect(reader.calls).toHaveLength(1);
    expect(store.getState().settings.consents.photoToAi).toEqual({
      granted: true,
      at: new Date(APP_NOW).toISOString(),
    });
  });

  it('with the consent already given the question is not asked again', async () => {
    const { reader, router } = open('/scan/photo', { granted: true });
    await take();
    await screen.findByRole('img', { name: t('scan.photoPreviewAlt') });
    recognize();
    await waitFor(() => expect(router.state.location.pathname).toBe('/scan/review'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(reader.calls).toHaveLength(1);
  });

  it('after the consent is taken back the question comes again', async () => {
    const { store } = open('/scan/photo', { granted: true });
    store
      .getState()
      .actions.settings.update({ consents: { photoToAi: { granted: false, at: null } } });
    await take();
    await screen.findByRole('img', { name: t('scan.photoPreviewAlt') });
    recognize();
    expect(await screen.findByRole('dialog', { name: t('scan.consentTitle') })).toBeInTheDocument();
  });
});

describe('when the photo cannot be read', () => {
  const codes: LabelReaderErrorCode[] = [
    'NETWORK',
    'TIMEOUT',
    'RATE_LIMITED',
    'NO_INGREDIENTS_FOUND',
    'IMAGE_TOO_LARGE',
    'UNSUPPORTED_FORMAT',
    'BAD_REQUEST',
    'BAD_RESPONSE',
    'UNAVAILABLE',
  ];

  for (const code of codes) {
    it(`${code}: a clear message, the way to type by hand, and the photo stays for another try`, async () => {
      const reader = createFakeLabelReader(err({ code }));
      const { router } = open('/scan/photo', { reader, granted: true });
      await take();
      await screen.findByRole('img', { name: t('scan.photoPreviewAlt') });
      recognize();
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(t(`scan.photoError.${code}`));
      expect(within(alert).getByRole('link', { name: t('scan.photoManual') })).toHaveAttribute(
        'href',
        '/scan/paste',
      );
      expect(screen.getByRole('img', { name: t('scan.photoPreviewAlt') })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: t('scan.photoRetry') })).toBeEnabled();
      expect(router.state.location.pathname).toBe('/scan/photo');
    });
  }

  it('a file that is not a picture is refused on the device and never reaches the reader', async () => {
    const { reader } = open('/scan/photo', { granted: true });
    await take('scan.photoGallery', picture('text/plain'));
    expect(await screen.findByRole('alert')).toHaveTextContent(t('scan.photoError.NOT_AN_IMAGE'));
    expect(screen.queryByRole('img', { name: t('scan.photoPreviewAlt') })).not.toBeInTheDocument();
    expect(reader.calls).toHaveLength(0);
  });

  it('a picture the browser cannot open is explained', async () => {
    open('/scan/photo', { granted: true, imageDeps: createFakeImageDeps({ unreadable: true }) });
    await take();
    expect(await screen.findByRole('alert')).toHaveTextContent(t('scan.photoError.UNREADABLE'));
  });

  it('a picture that stays too big after shrinking is explained', async () => {
    open('/scan/photo', { granted: true, imageDeps: createFakeImageDeps({ sizes: [2_000_000] }) });
    await take();
    expect(await screen.findByRole('alert')).toHaveTextContent(t('scan.photoError.TOO_BIG'));
  });
});

describe('from the reading to the check', () => {
  async function readPhoto(reading = readingOk(), opts: OpenOptions = {}) {
    const view = open('/scan/photo', {
      reader: createFakeLabelReader(reading),
      granted: true,
      ...opts,
    });
    await take();
    await screen.findByRole('img', { name: t('scan.photoPreviewAlt') });
    recognize();
    await screen.findByRole('heading', { name: t('scan.reviewTitle') });
    return view;
  }

  it('the review screen is filled in from the reading and says where it came from', async () => {
    await readPhoto();
    expect(screen.getByLabelText(t('scan.reviewNameLabel'))).toHaveValue('Calm cream');
    expect(screen.getByLabelText(t('scan.reviewBrandLabel'))).toHaveValue('Test brand');
    expect(screen.getByLabelText(t('scan.reviewCategoryLabel'))).toHaveValue('moisturizer');
    expect(screen.getByText(t('scan.reviewFromPhoto'))).toBeInTheDocument();
    expect(screen.queryByText(t('scan.reviewLowConfidence'))).not.toBeInTheDocument();
  });

  it('an unknown category falls back to "other"; a missing name stays empty', async () => {
    await readPhoto(readingOk({ categoryGuess: 'moon cream', productName: null, brand: null }));
    expect(screen.getByLabelText(t('scan.reviewCategoryLabel'))).toHaveValue('other');
    expect(screen.getByLabelText(t('scan.reviewNameLabel'))).toHaveValue('');
    expect(screen.getByLabelText(t('scan.reviewBrandLabel'))).toHaveValue('');
  });

  it('a doubtful reading is marked as such', async () => {
    await readPhoto(readingOk({ confidence: 0.3 }));
    expect(screen.getByText(t('scan.reviewLowConfidence'))).toBeInTheDocument();
  });

  it('the text from the photo can be corrected like any other before the check', async () => {
    await readPhoto();
    expect(screen.getByRole('button', { name: t('scan.check') })).toBeEnabled();
  });

  it('the check saves the product as "from a photo" with the brand', async () => {
    const { store } = await readPhoto();
    fireEvent.click(screen.getByRole('button', { name: t('scan.check') }));
    await waitFor(() => expect(store.getState().scans).toHaveLength(1));
    const snapshot = store.getState().scans[0]?.productSnapshot;
    expect(snapshot?.compositionSource).toBe('photo');
    expect(snapshot?.brand).toBe('Test brand');
    expect(snapshot?.name).toBe('Calm cream');
  });

  it('the photo is not kept by default', async () => {
    const { photos, router } = await readPhoto();
    const keep = screen.getByRole('checkbox', { name: new RegExp(t('scan.reviewKeepPhoto')) });
    expect(keep).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: t('scan.check') }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/scan\/result\//));
    expect(await photos.keys()).toEqual({ ok: true, value: [] });
    expect(screen.queryByRole('button', { name: t('photo.remove') })).not.toBeInTheDocument();
  });

  it('with the tick the photo is kept on the device, shown on the result, and can be deleted', async () => {
    const { photos, router, store } = await readPhoto();
    fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(t('scan.reviewKeepPhoto')) }));
    fireEvent.click(screen.getByRole('button', { name: t('scan.check') }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/scan\/result\//));

    const id = store.getState().scans[0]?.productSnapshot.id ?? '';
    expect(await photos.keys()).toEqual({ ok: true, value: [id] });
    expect(await screen.findByRole('img', { name: t('photo.alt') })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: t('photo.remove') }));
    await waitFor(() =>
      expect(screen.queryByRole('img', { name: t('photo.alt') })).not.toBeInTheDocument(),
    );
    expect(await photos.keys()).toEqual({ ok: true, value: [] });
  });

  it('a pasted text has no brand field, no notice about a photo and no tick', async () => {
    open('/scan/paste');
    fireEvent.change(await screen.findByLabelText(t('scan.pasteLabel')), {
      target: { value: 'Aqua, Glycerin' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('scan.parse') }));
    await screen.findByRole('heading', { name: t('scan.reviewTitle') });
    expect(screen.queryByLabelText(t('scan.reviewBrandLabel'))).not.toBeInTheDocument();
    expect(screen.queryByText(t('scan.reviewFromPhoto'))).not.toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: new RegExp(t('scan.reviewKeepPhoto')) }),
    ).not.toBeInTheDocument();
  });
});
