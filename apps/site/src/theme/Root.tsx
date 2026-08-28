import type { ReactNode } from "react";
import { tokenCss } from "../lib/tokens";

export default function Root({ children }: { children: ReactNode }): ReactNode {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: tokenCss() }} />
      {children}
    </>
  );
}
