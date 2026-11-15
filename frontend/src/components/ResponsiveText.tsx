interface ResponsiveTextProps {
  /** Shown from the lg breakpoint (992 px) up. */
  desktop: string;
  /** Shown below lg. */
  mobile: string;
}

/** The designs use different copy on desktop and mobile; only one variant is visible (and exposed to assistive tech). */
export default function ResponsiveText({ desktop, mobile }: ResponsiveTextProps) {
  return (
    <>
      <span className="d-none d-lg-inline">{desktop}</span>
      <span className="d-lg-none">{mobile}</span>
    </>
  );
}
