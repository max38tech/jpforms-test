import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "特定商取引法に基づく表記 — JPForms" };

export default function Tokushoho() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">特定商取引法に基づく表記</h1>
      <p className="text-sm text-muted-foreground">
        Specified Commercial Transactions Act Disclosure
      </p>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">項目 / Item</TableHead>
                <TableHead>内容 / Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>販売業者 / Business Operator</TableCell>
                <TableCell>[Legal entity name to be registered]</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>運営責任者 / Manager</TableCell>
                <TableCell>[Representative name]</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>提携行政書士 / Partner Scrivener</TableCell>
                <TableCell>
                  Licensed Gyoseishoshi partner office [name & registration number].
                  Complex legal representation and document review are supervised by
                  this partner firm.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>所在地 / Location</TableCell>
                <TableCell>[Registered business address]</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>お問い合わせ / Contact Email</TableCell>
                <TableCell>support@jpforms.example.com</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>価格 / Pricing</TableCell>
                <TableCell>
                  Displayed on each form&apos;s detail page (consumption tax included).
                  Basic translation utilities may be offered free of charge.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>支払時期・方法 / Payment</TableCell>
                <TableCell>Credit card (one-time charge at time of purchase).</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>返品・キャンセル / Refund Policy</TableCell>
                <TableCell>
                  Due to the digital nature of generated documents, refunds are not
                  available after PDF generation. If a document cannot be generated
                  due to our fault, a full refund will be issued.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>提供時期 / Delivery Time</TableCell>
                <TableCell>Generated PDFs are delivered immediately after submission.</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
