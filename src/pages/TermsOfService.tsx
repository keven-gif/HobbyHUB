import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100dvh] px-5 pt-4 pb-20" style={{ backgroundColor: '#000000', color: '#aaaaaa' }}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} style={{ color: '#888888' }}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-display text-xl tracking-wider" style={{ color: '#ffffff' }}>
          TERMS OF SERVICE
        </h1>
      </div>

      <div className="font-body text-[13px] leading-relaxed space-y-4">
        <p><strong style={{ color: '#ffffff' }}>Effective Date:</strong> January 1, 2025</p>
        <p>Please read these Terms of Service ("Terms") carefully before using the HobbyHub mobile application ("App"). By accessing or using HobbyHub, you agree to be bound by these Terms.</p>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>1. ACCEPTANCE OF TERMS</h2>
        <p>By creating an account and using HobbyHub, you agree to these Terms and our Privacy Policy. If you do not agree, you may not use the App.</p>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>2. ELIGIBILITY</h2>
        <p>You must be at least 13 years old to use HobbyHub. By using the App, you represent and warrant that you meet this age requirement and have the legal capacity to enter into these Terms.</p>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>3. USER ACCOUNTS</h2>
        <p>When you create an account, you must provide accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</p>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>4. USER CONDUCT</h2>
        <p>You agree not to use HobbyHub to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Post or share content that is illegal, harmful, threatening, abusive, harassing, defamatory, or obscene</li>
          <li>Impersonate any person or entity, or falsely state your affiliation</li>
          <li>Post spam, unsolicited advertising, or promotional materials</li>
          <li>Upload viruses, malware, or any code designed to interfere with the App</li>
          <li>Attempt to gain unauthorized access to other users' accounts or our systems</li>
          <li>Harvest or collect personal information of other users without consent</li>
          <li>Violate any applicable laws or regulations</li>
        </ul>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>5. CONTENT AND INTELLECTUAL PROPERTY</h2>
        <p>You retain ownership of the content you post on HobbyHub. By posting content, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content within the App for the purpose of operating and improving the service.</p>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>6. COMMUNITY GUIDELINES</h2>
        <p>All users must follow our community guidelines. Key rules include:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Respect other users and their opinions</li>
          <li>Keep content relevant to the community topic</li>
          <li>No harassment, bullying, or hate speech</li>
          <li>No explicit or NSFW content</li>
          <li>Give proper credit when sharing others' work</li>
        </ul>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>7. MODERATION AND ENFORCEMENT</h2>
        <p>We reserve the right to remove any content that violates these Terms or our community guidelines. Repeated violations may result in temporary or permanent account suspension. Users can report content using the in-app report button.</p>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>8. TERMINATION</h2>
        <p>We may suspend or terminate your account at any time for violations of these Terms. You may also delete your account at any time through the profile settings. Upon termination, your right to use the App will immediately cease.</p>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>9. DISCLAIMER OF WARRANTIES</h2>
        <p>HobbyHub is provided "as is" without warranties of any kind, either express or implied. We do not warrant that the App will be uninterrupted, secure, or error-free.</p>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>10. LIMITATION OF LIABILITY</h2>
        <p>To the maximum extent permitted by law, HobbyHub and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App.</p>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>11. CHANGES TO TERMS</h2>
        <p>We may modify these Terms at any time. We will notify users of material changes through the App. Continued use after changes constitutes acceptance of the updated Terms.</p>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>12. GOVERNING LAW</h2>
        <p>These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.</p>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>13. CONTACT US</h2>
        <p>For questions about these Terms, contact us at: legal@hobbyhub.app</p>

        <p className="mt-6" style={{ color: '#555555' }}>Last updated: January 1, 2025</p>
      </div>
    </div>
  );
}
