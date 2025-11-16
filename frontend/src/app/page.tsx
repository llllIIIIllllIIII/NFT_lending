import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Shield, Zap, TrendingUp } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-20">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            NFT-Backed Lending
            <span className="block text-primary mt-2">Made Simple</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Borrow against your NFTs or lend to earn. Transparent, secure, and fully on-chain.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link href="/borrow">
              <Button size="lg" className="gap-2">
                Start Borrowing <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button size="lg" variant="outline">
                Browse Loans
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Secure Escrow</CardTitle>
              <CardDescription>
                Your NFTs are safely held in audited smart contracts until repayment or default.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Instant Funding</CardTitle>
              <CardDescription>
                List your terms, get funded immediately. No approval delays or manual reviews.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Earn Interest</CardTitle>
              <CardDescription>
                Lenders choose offers with competitive returns. Fixed rates, no surprises.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Stats */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold">$0M+</div>
                <div className="text-muted-foreground">Total Volume</div>
              </div>
              <div>
                <div className="text-4xl font-bold">0</div>
                <div className="text-muted-foreground">Active Loans</div>
              </div>
              <div>
                <div className="text-4xl font-bold">0%</div>
                <div className="text-muted-foreground">Avg. APR</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
