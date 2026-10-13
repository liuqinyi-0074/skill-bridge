import { useEffect, useRef } from "react";
export default function ServiceUnavailable() {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <section
      aria-labelledby="service-unavailable"
      className="mx-auto max-w-2xl px-6 py-20 text-center"
    >
      <h1
        id="service-unavailable"
        ref={heading}
        tabIndex={-1}
        className="text-3xl font-bold"
      >
        Service temporarily unavailable
      </h1>
      <p className="mt-4">
        We cannot connect to the live service right now. Your saved plan is
        still stored on this device.
      </p>
      <p className="mt-3">
        Requests have stopped. You can try again when the service is available,
        or enter Demo Mode to explore with sample data.
      </p>
      <p className="mt-3">
        If you were sending feedback, receipt could not be confirmed. We will
        not resend it automatically.
      </p>
      <button
        type="button"
        className="mt-6 rounded-md border px-4 py-2 font-semibold"
        onClick={() => window.location.reload()}
      >
        Try Live Mode again
      </button>
    </section>
  );
}
