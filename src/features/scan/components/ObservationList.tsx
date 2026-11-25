import type { Observation } from '@/types';
import { describeObservation, type DescribeContext } from '../utils/describe';
import styles from '../styles/scan.module.css';

type Props = {
  title: string;
  observations: readonly Observation[];
  context: DescribeContext;
};

// A titled list of observations (nothing is drawn when there are none).
export function ObservationList({ title, observations, context }: Props) {
  if (observations.length === 0) return null;
  return (
    <section className={styles.section} aria-label={title}>
      <h2>{title}</h2>
      <ul>
        {observations.map((observation) => (
          <li key={observation.id}>
            {describeObservation(observation, context).map((line, index) => (
              <p key={`${index}-${line}`}>{line}</p>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
