import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { profileContent } from '@/test/data/personas';
import { createRealContent } from '@/test/helpers/fakes';
import { TextBlocks } from '../TextBlocks';

const questionnaire = createRealContent().bundle.questionnaire;
const content = { ...profileContent({ combinationText: false }), questionnaire };

describe('TextBlocks', () => {
  it('shows the name and the text of a block that has content', () => {
    render(
      <TextBlocks
        blocks={[{ kind: 'skin_type', key: 'oily', contentId: 'type-oily' }]}
        content={content}
      />,
    );
    expect(screen.getByRole('heading', { name: 'name oily' })).toBeInTheDocument();
    expect(screen.getByText('text oily')).toBeInTheDocument();
  });

  it('a block without content shows the name from the questionnaire and "being prepared"', () => {
    render(
      <TextBlocks
        blocks={[{ kind: 'condition', key: 'combination', contentId: null }]}
        content={content}
      />,
    );
    expect(screen.getByRole('heading', { name: /Комбінована/ })).toBeInTheDocument();
    expect(screen.getByText(t('common.contentPending'))).toBeInTheDocument();
  });

  it('without a record at all (public policy) it still does not invent a text', () => {
    render(
      <TextBlocks
        blocks={[{ kind: 'skin_type', key: 'unsure', contentId: null }]}
        content={{ ...content, skinTypes: [] }}
      />,
    );
    expect(screen.getByText(t('common.contentPending'))).toBeInTheDocument();
  });
});
