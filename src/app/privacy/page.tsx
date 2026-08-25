import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Privacy Policy — JPForms" };

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Privacy Policy（個人情報保護方針）</h1>
      <Card>
        <CardHeader><CardTitle>Purpose of Use</CardTitle></CardHeader>
        <CardContent className="text-sm leading-relaxed">
          We process personal information — including names, addresses, and form
          responses — solely to generate requested administrative documents, maintain
          your submission history, and provide customer support, in accordance with
          Japan&apos;s Act on the Protection of Personal Information (APPI,
          個人情報の保護に関する法律).
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Data Storage & Security</CardTitle></CardHeader>
        <CardContent className="text-sm leading-relaxed">
          Form data is stored in encrypted Supabase (PostgreSQL) infrastructure with
          Row Level Security enforced so that only you can access your own records.
          Generated PDFs are stored in private storage buckets and served via
          time-limited signed URLs.
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Third-Party Processing</CardTitle></CardHeader>
        <CardContent className="text-sm leading-relaxed">
          Form field labels (not your personal responses) may be processed by AI
          providers (Google) for schema translation. Your personal answers are not
          used for AI training. Legal representation matters shared with our partner
          scrivener office are handled under professional confidentiality obligations.
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Your Rights（開示・訂正・利用停止）</CardTitle></CardHeader>
        <CardContent className="text-sm leading-relaxed">
          Under APPI you may request disclosure, correction, or discontinuation of use
          of your personal data by contacting privacy@jpforms.example.com. We will
          respond within the statutory period.
        </CardContent>
      </Card>
    </div>
  );
}
