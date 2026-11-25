import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { APP_VERSION } from '@/content';
import { t } from '@/i18n';
import { createRealContent, createTestContent } from '@/test/fakes';
import { PERSONAS } from '@/test/personas';
import { renderApp } from '@/test/appHarness';
import { summarizeContent } from './summarizeContent';

afterEach(cleanup);

describe('the About screen', () => {
  it('says what the app is, for whom, and that no brand stands behind it', async () => {
    renderApp('/profile/about');
    expect(await screen.findByRole('heading', { name: t('about.title') })).toBeInTheDocument();
    expect(screen.getByText(t('about.whatText'))).toBeInTheDocument();
    expect(screen.getByText(t('about.forWhomText'))).toBeInTheDocument();
    expect(screen.getByText(t('about.independenceText'))).toBeInTheDocument();
  });

  it('shows the sources of the real content with the counts by status (demo policy)', async () => {
    const content = createRealContent('demo');
    renderApp('/profile/about', { services: { content } });
    await screen.findByRole('heading', { name: t('about.title') });
    const summary = summarizeContent(content.bundle);
    expect(summary.sources.length).toBeGreaterThan(0);
    for (const source of summary.sources) {
      expect(
        screen.getByText(`${source.name}. ${t('about.sourceRecords', { count: source.count })}`),
      ).toBeInTheDocument();
    }
    expect(
      screen.getByText(t('about.statusDraft', { count: summary.statuses.draft })),
    ).toBeInTheDocument();
    expect(screen.getByText(t('about.policyDemo'))).toBeInTheDocument();
  });

  it('under the public policy nothing unverified is shown, and the screen says so honestly', async () => {
    const content = createRealContent('public');
    renderApp('/profile/about', { services: { content } });
    await screen.findByRole('heading', { name: t('about.title') });
    expect(screen.getByText(t('about.policyPublic'))).toBeInTheDocument();
    expect(screen.getByText(t('about.statusVerified', { count: 0 }))).toBeInTheDocument();
    expect(screen.getByText(t('about.statusDraft', { count: 0 }))).toBeInTheDocument();
    expect(screen.getByText(t('about.sourcesEmpty'))).toBeInTheDocument();
  });

  it('shows the app version, the content version and the limits', async () => {
    renderApp('/profile/about', { services: { content: createTestContent({ version: '9.8.7' }) } });
    await screen.findByRole('heading', { name: t('about.title') });
    expect(screen.getByText(t('about.appVersion', { version: APP_VERSION }))).toBeInTheDocument();
    expect(screen.getByText(t('about.contentVersion', { version: '9.8.7' }))).toBeInTheDocument();
    for (const key of [
      'about.limitNotMedical',
      'about.limitOcr',
      'about.limitConcentration',
      'about.limitData',
    ] as const) {
      expect(screen.getByText(t(key))).toBeInTheDocument();
    }
  });

  it('links to privacy and the disclaimer', async () => {
    renderApp('/profile/about');
    await screen.findByRole('heading', { name: t('about.title') });
    expect(screen.getByRole('link', { name: t('about.privacyLink') })).toHaveAttribute(
      'href',
      '/profile/privacy',
    );
    expect(screen.getByRole('link', { name: t('about.disclaimerLink') })).toHaveAttribute(
      'href',
      '/profile/disclaimer',
    );
  });
});

describe('the Privacy screen', () => {
  it('says which data exist, where they live, and what goes to the server and when', async () => {
    renderApp('/profile/privacy');
    expect(await screen.findByRole('heading', { name: t('privacy.title') })).toBeInTheDocument();
    for (const key of [
      'privacy.whereText',
      'privacy.serverText',
      'privacy.serverNever',
      'privacy.noText',
    ] as const) {
      expect(screen.getByText(t(key))).toBeInTheDocument();
    }
    expect(screen.getByText(t('privacy.which5'))).toBeInTheDocument();
  });

  it('sends the person to the data and consent screens', async () => {
    renderApp('/profile/privacy');
    await screen.findByRole('heading', { name: t('privacy.title') });
    expect(screen.getByRole('link', { name: t('privacy.manageData') })).toHaveAttribute(
      'href',
      '/profile/settings/data',
    );
    expect(screen.getByRole('link', { name: t('privacy.manageConsents') })).toHaveAttribute(
      'href',
      '/profile/settings/consents',
    );
  });

  it('makes no absolute promises (no guarantees, no 100%)', async () => {
    renderApp('/profile/privacy');
    await screen.findByRole('heading', { name: t('privacy.title') });
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/100\s*%|гарант|абсолютн|повністю безпечн/i);
  });
});

describe('the Disclaimer screen', () => {
  it('shows the medical disclaimer text from the content file', async () => {
    renderApp('/profile/disclaimer');
    expect(
      await screen.findByRole('heading', { name: t('disclaimerPage.title') }),
    ).toBeInTheDocument();
    const note = screen.getByRole('note', { name: t('disclaimer.label') });
    expect(within(note).getByText(/лікаря-дерматолога/)).toBeInTheDocument();
  });
});

describe('links in the profile', () => {
  it('are reachable with a profile', async () => {
    renderApp('/profile', { persona: PERSONAS.T2 });
    await screen.findByRole('heading', { name: t('nav.profile') });
    expect(screen.getByRole('link', { name: t('profile.aboutLink') })).toHaveAttribute(
      'href',
      '/profile/about',
    );
    expect(screen.getByRole('link', { name: t('profile.privacyLink') })).toHaveAttribute(
      'href',
      '/profile/privacy',
    );
    expect(screen.getByRole('link', { name: t('profile.disclaimerLink') })).toHaveAttribute(
      'href',
      '/profile/disclaimer',
    );
  });

  it('are reachable before the test too', async () => {
    renderApp('/profile');
    await screen.findByRole('heading', { name: t('nav.profile') });
    expect(screen.getByRole('link', { name: t('profile.aboutLink') })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('profile.privacyLink') })).toBeInTheDocument();
  });
});
