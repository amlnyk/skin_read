import { Component, type ReactNode } from 'react';
import { t } from '@/i18n';
import styles from './ErrorBoundary.module.css';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  // No componentDidCatch on purpose: nothing is logged, so no user data can leak into logs.

  private reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.box} role="alert">
          <h1 className={styles.title}>{t('errors.title')}</h1>
          <p>{t('errors.hint')}</p>
          <button type="button" className={styles.button} onClick={this.reset}>
            {t('errors.retry')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
