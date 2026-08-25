import { getSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export const metadata = { title: "Legal Scrivener Advisory — JPForms" };

export default async function LegalScrivenerPage() {
  const content = await getSiteContent();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">⚖ Legal Scrivener Advisory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Required disclosure regarding our licensed Gyoseishoshi (Administrative
          Scrivener) partnership, per the Administrative Scrivener Act (行政書士法).
        </p>
      </div>

      <div className="rounded-lg border p-5">
        <h2 className="font-semibold">Partner Scrivener Details</h2>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="col-span-2">{content.scrivener_partner_name}</dd>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-muted-foreground">Office</dt>
            <dd className="col-span-2">{content.scrivener_office_name}</dd>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-muted-foreground">Registration No.</dt>
            <dd className="col-span-2">{content.scrivener_registration_number}</dd>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-muted-foreground">Address</dt>
            <dd className="col-span-2">{content.scrivener_office_address}</dd>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-muted-foreground">Contact</dt>
            <dd className="col-span-2">{content.scrivener_office_contact}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border p-5">
        <h2 className="font-semibold">Notice</h2>
        <div className="mt-3 space-y-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {content.scrivener_notice_body}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        See also our{" "}
        <a href="/tokushoho" className="underline">
          特定商取引法に基づく表記
        </a>{" "}
        and{" "}
        <a href="/terms" className="underline">
          Terms of Service
        </a>{" "}
        for related disclosures.
      </p>
    </div>
  );
}
