import styles from './MenuDivider.module.css'

/**
 * A horizontal divider line between menu items
 */
export function MenuDivider(): React.JSX.Element {
  return <hr className={styles.divider} />
}
