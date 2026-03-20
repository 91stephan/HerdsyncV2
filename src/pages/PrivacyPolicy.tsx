import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-display">Privacy Policy</h1>
          <p className="text-muted-foreground mt-1">
            Effective Date: 20 March 2026
          </p>
        </div>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Your privacy is important to us. This Privacy Policy explains how HerdSync ("we," "us," or "our") 
                collects, uses, discloses, and safeguards your information when you use our web and mobile application 
                available at <a href="https://herdsync.co.za" className="text-primary hover:underline">herdsync.co.za</a>. 
                Please read this policy carefully. By using HerdSync, you consent to the practices described herein.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>1. Company Information</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <ul className="space-y-2">
              <li><strong className="text-foreground">Application Name:</strong> HerdSync</li>
              <li><strong className="text-foreground">Website:</strong>{" "}
                <a href="https://herdsync.co.za" className="text-primary hover:underline">herdsync.co.za</a>
              </li>
              <li><strong className="text-foreground">Contact Email:</strong>{" "}
                <a href="mailto:91Stephan@gmail.com" className="text-primary hover:underline">91Stephan@gmail.com</a>
              </li>
              <li><strong className="text-foreground">Location:</strong> 685 Keet Avenue, Les Marais, Pretoria, Gauteng, South Africa, 0084</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-6">
            <div>
              <h4 className="font-semibold text-foreground mb-2">2.1 Account Information</h4>
              <p>
                When you register or sign in using Google Authentication, we collect your email address and display name. 
                If you create an account directly, we collect your email address and a securely hashed password.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">2.2 Farm & Livestock Data</h4>
              <p>
                We collect data you voluntarily provide about your farming operations, including but not limited to: 
                animal health records, breeding records, feeding schedules, inventory data, financial records (expenses and sales), 
                employee information, compliance documents, and farm management notes.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">2.3 Location Data</h4>
              <p>
                With your permission, we collect approximate location data to provide weather forecasts, 
                market insights, and location-based features such as animal tracking maps. You may disable 
                location services at any time through your device settings.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">2.4 Photos & Media</h4>
              <p>
                When you use the camera feature to photograph livestock, those images are uploaded and stored securely. 
                Images may be processed by AI services (Google Gemini) for animal identification purposes when you use 
                the "Ask a Pro" feature.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">2.5 Usage & Analytics Data</h4>
              <p>
                We automatically collect certain technical data including device type, operating system, browser type, 
                app performance metrics, error logs, and general usage patterns. This data helps us improve the 
                application and diagnose issues.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">2.6 Payment Information</h4>
              <p>
                Payment transactions are processed by third-party providers (Yoco, PayPal). We do not store your 
                full credit card or bank details. We may retain transaction references and subscription status 
                for billing purposes.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, operate, and maintain livestock management features</li>
              <li>Deliver AI-powered farming advice and animal identification through the "Ask a Pro" feature</li>
              <li>Provide market price insights and weather data relevant to your region</li>
              <li>Process subscriptions and payments</li>
              <li>Send service-related notifications and alerts</li>
              <li>Generate compliance reports and audit packs</li>
              <li>Improve app performance, fix bugs, and develop new features</li>
              <li>Ensure security and prevent fraud</li>
              <li>Communicate important updates about the Service</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-6">
            <p>
              We use the following third-party services that may process your data in accordance with their 
              own privacy policies:
            </p>
            <div>
              <h4 className="font-semibold text-foreground mb-2">4.1 Google Authentication</h4>
              <p>Used for secure sign-in. Google may collect data as per their privacy policy at{" "}
                <a href="https://policies.google.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  policies.google.com/privacy
                </a>.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">4.2 Supabase</h4>
              <p>
                Used for database storage, authentication, and backend functions. Data is stored securely with 
                encryption at rest and in transit.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">4.3 Google Gemini AI</h4>
              <p>
                Used to power the "Ask a Pro" feature and photo-based animal identification. Queries and images 
                sent to this service are processed in accordance with Google's AI data usage policies. We do not 
                use your data to train AI models.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">4.4 Map & Weather Services</h4>
              <p>
                Location data may be shared with mapping providers (Leaflet/OpenStreetMap) and weather APIs 
                to deliver location-specific features.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">4.5 Payment Processors</h4>
              <p>
                Yoco and PayPal are used to process payments. Your payment data is handled directly by these 
                processors and is subject to their respective privacy policies.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Data Sharing & Disclosure</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <p>We do not sell your personal data. We may share your information only in the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">With your consent:</strong> When you explicitly authorise sharing, such as inviting users to your farm.</li>
              <li><strong className="text-foreground">Service providers:</strong> With third-party services described in Section 4, solely to operate the platform.</li>
              <li><strong className="text-foreground">Legal compliance:</strong> When required by law, regulation, or legal process.</li>
              <li><strong className="text-foreground">Safety:</strong> To protect the rights, property, or safety of HerdSync, our users, or the public.</li>
              <li><strong className="text-foreground">Business transfers:</strong> In connection with a merger, acquisition, or sale of assets, with prior notice.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Data Storage & Retention</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <p>
              Your data is stored on secure servers with industry-standard protections. We retain your data for 
              as long as your account is active or as needed to provide you with our services. Upon account 
              deletion, we will remove your personal data within 30 days, except where we are required by law 
              to retain certain records.
            </p>
            <p>
              Farm data, livestock records, and compliance documents may be retained for the duration required 
              by applicable agricultural regulations.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Your Rights</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <p>Under applicable data protection laws (including GDPR and POPIA), you have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong className="text-foreground">Rectification:</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong className="text-foreground">Deletion:</strong> Request deletion of your personal data ("right to be forgotten").</li>
              <li><strong className="text-foreground">Data portability:</strong> Request export of your data in a structured, machine-readable format.</li>
              <li><strong className="text-foreground">Restriction:</strong> Request restriction of processing of your personal data.</li>
              <li><strong className="text-foreground">Objection:</strong> Object to processing of your personal data for certain purposes.</li>
              <li><strong className="text-foreground">Withdraw consent:</strong> Withdraw your consent at any time where processing is based on consent.</li>
            </ul>
            <p>
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:91Stephan@gmail.com" className="text-primary hover:underline">91Stephan@gmail.com</a>. 
              We will respond to your request within 30 days.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Data Security</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <p>We implement robust security measures to protect your data, including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption of data in transit (TLS/SSL) and at rest</li>
              <li>Secure authentication with leaked password protection</li>
              <li>Row-level security policies ensuring users can only access their own farm data</li>
              <li>HMAC-SHA256 signature verification for payment webhooks</li>
              <li>Rate limiting on authentication endpoints</li>
              <li>Sensitive data masking for PII (salaries, ID numbers) via secure database views</li>
              <li>Regular security updates and vulnerability assessments</li>
              <li>JWT-based session management</li>
            </ul>
            <p>
              While we strive to use commercially acceptable means to protect your personal data, no method 
              of electronic storage or transmission is 100% secure. We cannot guarantee absolute security.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Cookies & Tracking</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <p>
              HerdSync uses essential cookies and local storage for authentication and session management. 
              We do not use third-party advertising or tracking cookies. Analytics data is collected in 
              aggregate form to improve application performance.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>10. Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <p>
              HerdSync is not intended for use by children under the age of 13. We do not knowingly collect 
              personal information from children under 13. If we become aware that we have collected data 
              from a child under 13 without verified parental consent, we will take steps to delete that 
              information promptly. If you believe a child under 13 has provided us with personal data, 
              please contact us immediately.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>11. International Data Transfers</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <p>
              Your data may be transferred to, and processed in, countries other than South Africa where our 
              third-party service providers operate. Where such transfers occur, we ensure appropriate 
              safeguards are in place in compliance with POPIA and GDPR, including standard contractual 
              clauses and adequacy decisions where applicable.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>12. Regulatory Compliance</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-6">
            <div>
              <h4 className="font-semibold text-foreground mb-2">12.1 POPIA (Protection of Personal Information Act)</h4>
              <p>
                As a South African service, HerdSync complies with the Protection of Personal Information Act, 2013 (POPIA). 
                You may lodge a complaint with the Information Regulator of South Africa if you believe your 
                personal information has been mishandled.
              </p>
              <p className="mt-2">
                Information Regulator:{" "}
                <a href="https://inforegulator.org.za" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  inforegulator.org.za
                </a>
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">12.2 GDPR (General Data Protection Regulation)</h4>
              <p>
                For users in the European Economic Area (EEA), we process personal data in compliance with the GDPR. 
                The legal bases for processing include consent, contract performance, and legitimate interest in 
                providing and improving our services.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>13. Changes to This Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes 
              by posting the new policy on this page and updating the "Effective Date" at the top. We encourage 
              you to review this policy periodically. Continued use of HerdSync after changes constitutes 
              acceptance of the updated policy.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>14. Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, 
              please contact us at:
            </p>
            <p>
              Email: <a href="mailto:91Stephan@gmail.com" className="text-primary hover:underline">91Stephan@gmail.com</a><br />
              Phone: <a href="tel:+27783186923" className="text-primary hover:underline">+27 78 318 6923</a><br />
              Address: 685 Keet Avenue, Les Marais, Pretoria, Gauteng, South Africa, 0084
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
