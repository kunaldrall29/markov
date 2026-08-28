import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { useThemeConfig } from "@docusaurus/theme-common";
import type { Props } from "@theme/Logo";
import type { ReactNode } from "react";

export default function Logo(props: Props): ReactNode {
  const {
    siteConfig: { title },
  } = useDocusaurusContext();
  const {
    navbar: { title: navbarTitle },
  } = useThemeConfig();
  const { imageClassName, titleClassName, ...propsRest } = props;

  return (
    <Link to="/" {...propsRest}>
      <svg
        className={imageClassName}
        width="34"
        height="14"
        viewBox="0 0 34 14"
        aria-hidden="true"
      >
        <circle cx="5" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <line x1="12" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M18 3.8 L22.4 7 L18 10.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="29" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      {navbarTitle != null && (
        <b className={titleClassName}>{navbarTitle ?? title}</b>
      )}
    </Link>
  );
}
