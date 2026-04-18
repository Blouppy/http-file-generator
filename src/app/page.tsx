import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold tracking-tight mb-4">HTTP File Generator</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your OpenAPI specifications into ready-to-use .http files in seconds
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/upload">Get Started</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: "📄",
              title: "Parse OpenAPI Specs",
              description: "Upload JSON or YAML OpenAPI 3.x specs and let us do the parsing.",
            },
            {
              icon: "✅",
              title: "Select Endpoints",
              description: "Choose exactly which endpoints you want to generate .http files for.",
            },
            {
              icon: "⚡",
              title: "Generate .http Files",
              description: "Instantly generate ready-to-use .http files compatible with VS Code REST Client.",
            },
            {
              icon: "🗜️",
              title: "Download as ZIP",
              description: "Download all files in one ZIP archive, organized by API tags.",
            },
          ].map(({ icon, title, description }) => (
            <Card key={title}>
              <CardContent className="pt-6">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
