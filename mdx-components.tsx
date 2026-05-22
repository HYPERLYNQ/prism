import type { MDXComponents } from "mdx/types";
import Link from "next/link";

/**
 * Global MDX component map — required by `@next/mdx` in the App Router.
 *
 * Element styling is handled by the `.blog-prose` wrapper in globals.css (so
 * authored Markdown stays clean); the one behavioural override here is links:
 * internal links route through `next/link`, external links open in a new tab
 * with `rel="noopener noreferrer"` (matches the rest of the site's link policy).
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: ({ href = "", children, ...props }) => {
      const isInternal = href.startsWith("/") || href.startsWith("#");
      if (isInternal) {
        return (
          <Link href={href} {...props}>
            {children}
          </Link>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      );
    },
    ...components,
  };
}
