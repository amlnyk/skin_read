import disclaimer from '../../../content/disclaimer.json';
import { MedicalDisclaimer } from '../../../ui';

export function HomePage() {
  return (
    <section>
      <h1>Головна</h1>
      <p>Розділ ще в розробці.</p>
      <MedicalDisclaimer text={disclaimer.text} />
    </section>
  );
}
