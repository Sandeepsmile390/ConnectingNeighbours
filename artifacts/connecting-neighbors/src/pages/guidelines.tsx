import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Scale, MessageCircle, HeartHandshake, BookOpen, AlertCircle } from "lucide-react";

export default function Guidelines() {
  const sections = [
    {
      title: "Colony Verification & Badges",
      icon: ShieldCheck,
      color: "text-indigo-500 bg-indigo-500/10",
      description: "How we maintain safety and authenticity in the portal.",
      content: [
        "Every member must choose and request to join their specific colony/neighborhood.",
        "Your account starts as 'Pending' upon joining a colony.",
        "A designated Colony Admin will review and verify your membership based on apartment details or physical residency.",
        "Once verified, you will receive a verified badge (check icon) next to your profile, unlocking community-wide posting and sharing permissions."
      ]
    },
    {
      title: "Community Standards",
      icon: Scale,
      color: "text-purple-500 bg-purple-500/10",
      description: "Rules for a friendly, neighborly environment.",
      content: [
        "Be kind and respectful. Harassment, hate speech, or abuse will lead to immediate ban.",
        "Keep posts relevant to the local colony or immediate surrounding neighborhood.",
        "Strictly no spamming, commercial marketing campaigns, or unauthorized advertisements.",
        "Resolve personal conflicts privately through Direct Messaging rather than public feed arguments."
      ]
    },
    {
      title: "Marketplace & Resource Sharing",
      icon: HeartHandshake,
      color: "text-teal-500 bg-teal-500/10",
      description: "Best practices for local trading and lending.",
      content: [
        "List items honestly with accurate descriptions and pricing (or mark as Free).",
        "Borrow shared tools and resources responsibly. Return them on time and in the same condition.",
        "Arrange handovers and transactions in public, safe, or well-lit spaces within the colony.",
        "Commercial selling or bulk resale of wholesale items is prohibited."
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
          <BookOpen className="h-8 w-8 text-primary" />
          Community Guidelines & Terms
        </h1>
        <p className="text-muted-foreground">
          Welcome to Connecting Neighbors. Please read our guidelines to help maintain a supportive, collaborative, and safe neighborhood environment.
        </p>
      </div>

      {/* Safety Alert banner */}
      <Card className="border-amber-500/20 bg-amber-500/[0.02] shadow-sm">
        <CardContent className="p-4 flex gap-3.5 items-start">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm text-foreground">Important Notice on Trust</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              We require physical verification of residents to protect against outsiders. Make sure you select the correct colony on your profile page to request verification from your local colony administrator.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {sections.map((section, index) => {
          const Icon = section.icon;
          return (
            <Card key={index} className="shadow-sm hover:border-primary/10 transition-colors">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className={`p-2.5 rounded-xl ${section.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">{section.title}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">{section.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <ul className="space-y-2.5 list-disc pl-5 text-sm text-muted-foreground leading-relaxed">
                  {section.content.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Basic Terms */}
      <Card className="border-muted/50 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            Terms of Use Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
          <p>
            By using this application, you agree to submit true and accurate information regarding your name, apartment address, and colony association. Misrepresenting your identity or address is a violation of community guidelines and will result in revocation of access.
          </p>
          <p>
            Connecting Neighbors acts as a neutral communication portal and is not liable for transactions, items traded in the marketplace, or resources shared between individual users. Neighbors are encouraged to exercise safe and honest judgement when meeting in person.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
