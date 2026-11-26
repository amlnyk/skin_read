import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { needsComposition } from '@/logic/analyze';
import { useAppStore } from '@/store';
import styles from '../styles/products.module.css';

// "Мої засоби": the collection. A product with only a name has the status "Потрібен склад".
export function CollectionPage() {
  const products = useAppStore((state) => state.products);

  return (
    <section className={styles.page}>
      <Link to="/care" className={styles.back}>
        {t('products.back')}
      </Link>
      <h1>{t('products.title')}</h1>
      <Link to="/care/products/new" className={styles.linkButton}>
        {t('products.add')}
      </Link>
      {products.length === 0 ? <p>{t('products.empty')}</p> : null}
      <ul className={styles.list}>
        {products.map((product) => (
          <li key={product.id} className={styles.item}>
            <Link to={`/care/products/${product.id}`}>
              <strong>{product.name}</strong>
            </Link>
            {product.brand ? <p>{product.brand}</p> : null}
            <p className={styles.hint}>{t(`category.${product.category}`)}</p>
            {needsComposition(product) ? (
              <p className={styles.tag}>{t('products.needsComposition')}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
