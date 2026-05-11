import { Link } from "react-router-dom";
import { Wheat } from "lucide-react";

/**
 * Shared internal-linking footer used on public marketing/legal pages.
 * Provides search engines (and humans) with a consistent set of crawlable
 * internal links to the site's most important destinations.
 */
export function SEOFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-card/80 border-t border-border py-12 mt-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Wheat className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-display">HerdSync</h3>
                <p className="text-xs text-muted-foreground">Farm Management</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Comprehensive farm management built for South African farmers, livestock, compliance, and reporting in one place.
            </p>
          </div>
          <nav aria-label="Product">
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground transition-colors">Home</Link></li>
              <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li><Link to="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
            </ul>
          </nav>
          <nav aria-label="Resources">
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/blog/getting-started-with-livestock-tracking-south-africa" className="hover:text-foreground transition-colors">Livestock Tracking Guide</Link></li>
              <li><Link to="/blog/south-african-farm-compliance-checklist-2026" className="hover:text-foreground transition-colors">SA Compliance Checklist</Link></li>
              <li><Link to="/blog/cutting-feed-costs-without-cutting-condition" className="hover:text-foreground transition-colors">Cutting Feed Costs</Link></li>
              <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </nav>
          <nav aria-label="Legal">
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/disclaimer" className="hover:text-foreground transition-colors">Disclaimer</Link></li>
              <li><Link to="/delete-account" className="hover:text-foreground transition-colors">Delete Account</Link></li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© {year} HerdSync. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
