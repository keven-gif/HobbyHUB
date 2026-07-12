import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100dvh] px-5 pt-4 pb-20" style={{ backgroundColor: '#000000', color: '#aaaaaa' }}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} style={{ color: '#888888' }}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-display text-xl tracking-wider" style={{ color: '#ffffff' }}>
          PRIVACY POLICY
        </h1>
      </div>

      <div className="font-body text-[13px] leading-relaxed space-y-4">
        <p><strong style={{ color: '#ffffff' }}>Effective Date:</strong> January 1, 2025</p>
        <p>HobbyHub ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.</p>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>1. INFORMATION WE COLLECT</h2>
        <p>We may collect the following types of information:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong style={{ color: '#ffffff' }}>Account Information:</strong> Username, email address, profile name, and optional clan name when you register.</li>
          <li><strong style={{ color: '#ffffff' }}>Profile Content:</strong> Profile pictures, bio text, and posts you create within communities.</li>
          <li><strong style={{ color: '#ffffff' }}>Usage Data:</strong> Communities you join, posts you like, save, or comment on, and messages you send.</li>
          <li><strong style={{ color: '#ffffff' }}>Device Information:</strong> Device type, operating system version, and unique device identifiers for push notifications.</li>
          <li><strong style={{ color: '#ffffff' }}>Push Notification Tokens:</strong> Firebase Cloud Messaging tokens to deliver real-time notifications.</li>
        </ul>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>2. HOW WE USE YOUR INFORMATION</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>To provide and maintain the HobbyHub service</li>
          <li>To personalize your feed based on communities you join</li>
          <li>To enable real-time messaging between users</li>
          <li>To send push notifications for likes, comments, and messages</li>
          <li>To moderate content and enforce community guidelines</li>
          <li>To improve our app and user experience</li>
        </ul>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>3. HOW WE SHARE YOUR INFORMATION</h2>
        <p>We do not sell your personal information. We may share data with:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong style={{ color: '#ffffff' }}>Other Users:</strong> Your profile information, posts, and messages are visible to other HobbyHub users as intended by the app's social features.</li>
          <li><strong style={{ color: '#ffffff' }}>Service Providers:</strong> Firebase (Google Cloud) for authentication, database, storage, and push notifications.</li>
          <li><strong style={{ color: '#ffffff' }}>Legal Requirements:</strong> When required by law or to protect our rights and safety.</li>
        </ul>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>4. DATA SECURITY</h2>
        <p>We implement industry-standard security measures including Firebase Authentication with secure password hashing (bcrypt), Firestore security rules, and encrypted data transmission (HTTPS/TLS). However, no method of transmission over the Internet is 100% secure.</p>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>5. YOUR RIGHTS</h2>
        <p>You have the right to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Access, update, or delete your account and profile information</li>
          <li>Opt-out of push notifications through your device settings</li>
          <li>Request deletion of your personal data by contacting us</li>
        </ul>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>6. CHILDREN'S PRIVACY</h2>
        <p>HobbyHub is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13.</p>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>7. CHANGES TO THIS POLICY</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy in the app.</p>

        <h2 className="font-display text-base tracking-wider mt-6" style={{ color: '#ffffff' }}>8. CONTACT US</h2>
        <p>If you have questions about this Privacy Policy, contact us at: privacy@hobbyhub.app</p>

        <p className="mt-6" style={{ color: '#555555' }}>Last updated: January 1, 2025</p>
      </div>
    </div>
  );
}
