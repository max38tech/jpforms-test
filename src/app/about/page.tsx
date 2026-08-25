import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "About Us — JPForms" };

export default function About() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">About Us & Scrivener Partnership</h1>
      <Card>
        <CardHeader><CardTitle>Our Service</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            JPForms is a software platform that helps foreign residents in Japan
            understand, translate, and self-complete official Japanese administrative
            forms. Our tools provide translated questionnaires and automated PDF
            generation for informational self-application purposes.
          </p>
          <p>
            <strong>Legal representation matters:</strong> Under the Certified
            Administrative Procedures Legal Specialist (Gyoseishoshi) Act, certain
            services — including representation in immigration proceedings, agency
            filing (代理申請), preparation and review of legal documents (書類作成),
            and administrative appeals — may only be performed by licensed
            professionals. All such complex legal representation, agency filing,
            and document review services on this platform are provided under the
            supervision of our licensed Gyoseishoshi / Shiho-shoshi partner firm,
            and are dispatched directly to the certified partner scrivener office.
          </p>
          <p>
            The software itself does not provide legal advice or legal
            representation. When your matter requires professional legal action,
            we will introduce you to the appropriate licensed partner.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
