import { Link } from 'react-router-dom';
import { Twitter, MessageCircle, Instagram, Video, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const Footer = () => {
  const footerLinks = {
    platform: [
      { name: 'Create Challenges', href: '#' },
      { name: 'Tournaments', href: '#' },
      { name: 'Leaderboard', href: '#' },
      { name: 'Wallet-Based Records', href: '#' },
    ],
    games: [
      { name: 'FC 26', href: '#' },
      { name: 'Valorant', href: '#' },
      { name: 'CS2', href: '#' },
      { name: '2K26', href: '#' },
      { name: 'Call of Duty', href: '#' },
    ],
    company: [
      { name: 'Whitepaper', to: '/whitepaper' },
      { name: 'About Us', href: '#' },
      { name: 'Contact', href: '#' },
    ],
    support: [
      { name: 'Help Center', href: '#' },
      { name: 'Terms of Service', to: '/terms' },
      { name: 'Privacy Policy', to: '/privacy' },
      { name: 'Cookie Policy', href: '#' },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: 'https://twitter.com/USDFGAMING', label: 'X' },
    { icon: MessageCircle, href: 'https://t.me/+TPjhAyJiAF9mZTI0', label: 'Telegram' },
    { icon: Instagram, href: 'https://instagram.com/usdfgaming', label: 'Instagram' },
    { icon: Video, href: 'https://www.tiktok.com/@usdfgames', label: 'TikTok' },
  ];

  return (
    <footer className="relative w-full bg-void-dark border-t border-purple/10">
      {/* Main Footer */}
      <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-20 py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <a href="#" className="flex items-center gap-2 mb-6">
              <img
                src="/usdfglogo.png"
                alt="USDFG"
                className="h-10 w-auto object-contain"
              />
              <span className="font-display font-bold text-xl text-white">
                USDFG
              </span>
            </a>
            <p className="font-body text-white/50 text-sm leading-relaxed mb-6 max-w-sm">
              A skill-based competitive ecosystem built for performance.
            </p>

            {/* Newsletter */}
            <div className="mb-6">
              <p className="font-body text-sm text-white/70 mb-3">
                Subscribe to our newsletter
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 bg-purple/10 border-purple/30 text-white placeholder:text-white/30 focus:border-purple"
                />
                <Button
                  size="icon"
                  className="bg-purple hover:bg-purple-400 text-white"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={social.label}
                  className="w-10 h-10 flex items-center justify-center glass border border-purple/30 rounded-lg hover:border-purple/60 hover:bg-purple/20 transition-all"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4 text-white/70" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="font-display font-semibold text-white mb-4">
              Platform
            </h4>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="font-body text-sm text-white/50 hover:text-purple transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Games Links */}
          <div>
            <h4 className="font-display font-semibold text-white mb-4">
              Games
            </h4>
            <ul className="space-y-3">
              {footerLinks.games.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="font-body text-sm text-white/50 hover:text-purple transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-display font-semibold text-white mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  {'to' in link && link.to ? (
                    <Link
                      to={link.to}
                      className="font-body text-sm text-white/50 hover:text-purple transition-colors inline-block"
                    >
                      {link.name}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="font-body text-sm text-white/50 hover:text-purple transition-colors inline-block"
                    >
                      {link.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-display font-semibold text-white mb-4">
              Support
            </h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  {'to' in link && link.to ? (
                    <Link
                      to={link.to}
                      className="font-body text-sm text-white/50 hover:text-purple transition-colors inline-block"
                    >
                      {link.name}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="font-body text-sm text-white/50 hover:text-purple transition-colors inline-block"
                    >
                      {link.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-20 py-6 border-t border-purple/10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-body text-sm text-white/40">
            © 2026 USDFG. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              to="/terms"
              className="font-body text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Terms
            </Link>
            <Link
              to="/privacy"
              className="font-body text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Privacy
            </Link>
            <a
              href="#"
              className="font-body text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
