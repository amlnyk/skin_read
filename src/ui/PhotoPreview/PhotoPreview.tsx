import { Button } from '../Button';
import styles from './PhotoPreview.module.css';

type Props = {
  src: string;
  alt: string;
  /** The text of the delete button. When it is not given, there is no button. */
  removeLabel?: string;
  onRemove?: () => void;
};

// A photo of a label with an optional delete button. Texts come from the caller.
export function PhotoPreview({ src, alt, removeLabel, onRemove }: Props) {
  return (
    <figure className={styles.figure}>
      <img className={styles.image} src={src} alt={alt} />
      {removeLabel && onRemove ? (
        <Button variant="secondary" onClick={onRemove}>
          {removeLabel}
        </Button>
      ) : null}
    </figure>
  );
}
