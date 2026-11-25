import { useEffect, useRef } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { t } from '@/i18n';
import { needsComposition } from '@/logic/analyze';
import { useAppStore } from '@/store';
import { useChecks } from '../hooks/useChecks';
import styles from '../scan.module.css';

// /scan/check/:productId: checks a product of the collection and opens the result.
// The check runs once (the guard keeps a second render from saving a second result).
export function CheckProductPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const product = useAppStore((state) => state.products.find((entry) => entry.id === productId));
  const { profile, check } = useChecks();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !product || !profile || needsComposition(product)) return;
    done.current = true;
    const result = check(product);
    if (result) navigate(`/scan/result/${result.id}`, { replace: true });
  }, [product, profile, check, navigate]);

  if (!product) return <p role="status">{t('products.notFound')}</p>;
  if (!profile) return <Navigate to="/scan" replace />;
  if (needsComposition(product)) return <Navigate to={`/care/products/${product.id}`} replace />;
  return (
    <section className={styles.page}>
      <p role="status">{t('scan.checking')}</p>
      <Link to="/scan" className={styles.back}>
        {t('scan.back')}
      </Link>
    </section>
  );
}
