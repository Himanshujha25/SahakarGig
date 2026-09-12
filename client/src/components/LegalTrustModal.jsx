import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Lock, 
  Scale, 
  HelpCircle, 
  Phone, 
  Mail, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Bot, 
  Send,
  CheckCircle,
  AlertTriangle,
  Award
} from 'lucide-react';
import toast from '../lib/toast';

export default function LegalTrustModal({ isOpen, onClose, defaultTab = 'privacy' }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [expandedFaq, setExpandedFaq] = useState(null);
  
  // Support Form State
  const [ticketForm, setTicketForm] = useState({
    name: '',
    email: '',
    category: 'Payment/Escrow',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (!ticketForm.name.trim() || !ticketForm.email.trim() || !ticketForm.message.trim()) {
      toast.error('Please fill out all required fields in the support form.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const ticketId = 'SG-' + Math.floor(100000 + Math.random() * 900000);
      toast.success(`Support Ticket #${ticketId} submitted! A Cooperative officer will review your request shortly.`);
      setTicketForm({ name: '', email: '', category: 'Payment/Escrow', message: '' });
      setIsSubmitting(false);
    }, 600);
  };

  const handleLaunchAIChat = () => {
    onClose();
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-ai-chatbot'));
    }, 150);
  };

  const tabs = [
    { id: 'privacy', label: 'Privacy Policy', icon: Lock },
    { id: 'terms', label: 'Terms of Service', icon: FileText },
    { id: 'escrow', label: 'Dispute & Escrow', icon: Scale },
    { id: 'support', label: 'Support Center', icon: HelpCircle },
  ];

  const faqs = [
    {
      q: "How does SahakarGig verify local service providers?",
      a: "Every provider undergoes strict 3-stage validation: (1) Government Aadhaar & e-Shram UAN database verification, (2) Local Police criminal background screening, and (3) Physical endorsement by a registered local Cooperative Society secretary."
    },
    {
      q: "How does the Escrow payment mechanism protect my money?",
      a: "When you book a provider, your payment is held safely in Razorpay Cooperative Escrow. Money is ONLY transferred to the provider after you confirm completion with your 4-digit OTP at your doorstep."
    },
    {
      q: "What if I need emergency repair services late at night?",
      a: "Use our Emergency Booking feature. Our AI Geospatial Engine broadcasts your request to nearby verified night-shift electricians, plumbers, or technicians within a 5km radius in less than 30 seconds."
    },
    {
      q: "How are dispute resolutions handled if work is incomplete or unsatisfactory?",
      a: "You can open a dispute directly from your booking history. Our AI Dispute Audit system inspects photo proof, and the local Cooperative Society Dispute Board reviews and resolves claims within 24 hours with a 100% refund guarantee for valid claims."
    },
    {
      q: "What is the platform commission fee capped at?",
      a: "Under statutory cooperative regulations (Multi-State Cooperative Societies Act), SahakarGig caps platform management fees at a maximum of 12%. Annual operational surpluses are distributed back to member-workers as patronage dividends."
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-y-auto animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl bg-surface border border-outline-variant rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] my-auto">
        
        {/* Header */}
        <div className="px-6 py-5 bg-surface-container-low border-b border-outline-variant flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShieldCheck size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                Legal & Trust Center
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Government Verified
                </span>
              </h2>
              <p className="text-xs text-on-surface-variant">
                SahakarGig Cooperative Ecosystem • Ministry of Cooperation Aligned
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 bg-surface-container-lowest border-b border-outline-variant/60 overflow-x-auto no-scrollbar shrink-0">
          {tabs.map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50'
                }`}
              >
                <IconComp size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-on-surface-variant leading-relaxed">
          
          {/* TAB 1: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-on-surface text-base">Digital Personal Data Protection (DPDP Act 2023) Compliant</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Last updated: September 2026 • Governed by Registered Multi-State Cooperative Societies
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface border border-outline-variant text-emerald-600">
                  <Lock size={14} /> 256-Bit SSL Encrypted
                </div>
              </div>

              <section className="space-y-2">
                <h4 className="font-semibold text-on-surface text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  1. Zero Third-Party Data Monetization
                </h4>
                <p>
                  SahakarGig operates strictly as a cooperative-owned non-speculative digital infrastructure. We <strong>never sell, lease, trade, or monetize</strong> your personal contact details, location logs, or household booking history with third-party data brokers or marketing agencies.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-semibold text-on-surface text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  2. Geospatial Location Usage & Anonymization
                </h4>
                <p>
                  Location permissions are strictly requested to compute instant geospatial proximity between service providers and households. High-precision GPS tracking is active solely during dispatch and active service duration, after which coordinates are anonymized in our encrypted audit database.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-semibold text-on-surface text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  3. Worker & Household Document Storage
                </h4>
                <p>
                  Government identification numbers (Aadhaar, PAN, e-Shram UAN) and bank details uploaded for worker onboarding are verified via official DigiLocker API integrations and stored in AES-256 encrypted storage accessible exclusively by authorized Cooperative Society Secretaries.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-semibold text-on-surface text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  4. Household Address Confidentiality
                </h4>
                <p>
                  Your complete residential address and phone number are revealed only to the specific, verified provider who accepts your booking request. Unassigned providers or public searches can only view approximate neighborhood centroids.
                </p>
              </section>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant text-xs space-y-1.5">
                <p className="font-semibold text-on-surface">Data Subject Rights:</p>
                <p>You may request complete data portability or account deletion at any time by contacting our Data Protection Officer at <a href="mailto:privacy@sahakargig.coop" className="text-primary hover:underline font-medium">privacy@sahakargig.coop</a>.</p>
              </div>
            </div>
          )}

          {/* TAB 2: TERMS OF SERVICE */}
          {activeTab === 'terms' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-on-surface text-base">Multi-State Cooperative Societies Act Framework</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Democratic Governance • Equal Member Rights • Fair Wages Guarantee
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface border border-outline-variant text-primary">
                  <Award size={14} /> 12% Max Platform Fee Cap
                </div>
              </div>

              <section className="space-y-2">
                <h4 className="font-semibold text-on-surface text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  1. Cooperative Ownership & Democratic Charter
                </h4>
                <p>
                  SahakarGig is a cooperative marketplace owned and governed by primary worker societies and federation bodies. Unlike traditional gig aggregators, service providers are voting member-owners entitled to patronage dividends and fair labor protections.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-semibold text-on-surface text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  2. Platform Fee Cap & Surplus Redistribution
                </h4>
                <p>
                  In compliance with cooperative bylaws, platform maintenance fees are legally capped at a maximum of 12% of job value. Surplus operational revenues are allocated to worker welfare funds (PMSBY accident insurance, skill upgradation) and annual member dividends.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-semibold text-on-surface text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  3. Household Responsibilities & Safe Work Environment
                </h4>
                <p>
                  Households using SahakarGig agree to provide a safe, respectful environment for visiting cooperative providers. Zero tolerance is enforced for verbal harassment, discrimination, or non-payment of agreed job scope.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-semibold text-on-surface text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  4. Cancellation Policy
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Before Provider Acceptance:</strong> 100% free cancellation with instant escrow refund.</li>
                  <li><strong>After Provider Arrival:</strong> A nominal convenience fee of ₹50 is transferred directly to the provider for travel time and effort.</li>
                </ul>
              </section>
            </div>
          )}

          {/* TAB 3: DISPUTE & ESCROW */}
          {activeTab === 'escrow' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-on-surface text-base">Razorpay Smart Escrow & Guarantee</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    100% Payment Protection • Local Board Arbitration • Instant Refund Protocol
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface border border-outline-variant text-amber-600">
                  <Scale size={14} /> 24-Hour Resolution
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant text-center space-y-2">
                  <div className="w-8 h-8 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">1</div>
                  <h5 className="font-bold text-on-surface text-xs">Funds Locked in Escrow</h5>
                  <p className="text-[11.5px] text-on-surface-variant">Payment is held securely when booking starts. Neither party can tamper with escrow funds.</p>
                </div>
                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant text-center space-y-2">
                  <div className="w-8 h-8 mx-auto rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm">2</div>
                  <h5 className="font-bold text-on-surface text-xs">OTP Job Verification</h5>
                  <p className="text-[11.5px] text-on-surface-variant">Funds are released ONLY when household provides completion OTP at service conclusion.</p>
                </div>
                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant text-center space-y-2">
                  <div className="w-8 h-8 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm">3</div>
                  <h5 className="font-bold text-on-surface text-xs">100% Refund Protection</h5>
                  <p className="text-[11.5px] text-on-surface-variant">If work is incomplete or flawed, dispute board issues direct UPI refund within 24 hours.</p>
                </div>
              </div>

              <section className="space-y-2">
                <h4 className="font-semibold text-on-surface text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Cooperative Dispute Arbitration Process
                </h4>
                <p>
                  Disputes are submitted through the booking details screen. You can upload photo proof and specify damage or incomplete work. The dispute is simultaneously evaluated by our AI Dispute Classifier and the local Primary Cooperative Society's arbitration panel for impartial adjudication.
                </p>
              </section>
            </div>
          )}

          {/* TAB 4: SUPPORT CENTER */}
          {activeTab === 'support' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Top Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold shadow-md">
                      <Bot size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-on-surface text-sm">AI Cooperative Assistant</h4>
                      <p className="text-xs text-on-surface-variant">Instant 24/7 Service & Dispute Guide</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLaunchAIChat}
                    className="w-full py-2.5 px-4 rounded-xl bg-primary text-on-primary font-semibold text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-primary/90 transition-all"
                  >
                    <span>Launch AI Support Chat</span>
                    <Bot size={15} />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold border border-emerald-500/20">
                      <Phone size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-on-surface text-sm">Toll-Free Cooperative Helpline</h4>
                      <p className="text-xs text-on-surface-variant">Mon - Sat (8 AM to 8 PM)</p>
                    </div>
                  </div>
                  <a
                    href="tel:18007242527"
                    className="w-full py-2.5 px-4 rounded-xl bg-surface-container border border-outline-variant text-on-surface font-semibold text-xs flex items-center justify-center gap-2 hover:bg-surface-container-high transition-all"
                  >
                    <Phone size={14} className="text-emerald-600" />
                    <span>1800-SAHAKAR-GIG (1800-724-2527)</span>
                  </a>
                </div>
              </div>

              {/* FAQs Accordion */}
              <div className="space-y-3">
                <h4 className="font-bold text-on-surface text-sm flex items-center gap-2">
                  <HelpCircle size={16} className="text-primary" />
                  Frequently Asked Questions (FAQ)
                </h4>
                <div className="space-y-2">
                  {faqs.map((faq, idx) => {
                    const isExpanded = expandedFaq === idx;
                    return (
                      <div 
                        key={idx}
                        className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest overflow-hidden transition-all"
                      >
                        <button
                          onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                          className="w-full px-4 py-3 text-left font-semibold text-xs sm:text-sm text-on-surface flex items-center justify-between gap-3 hover:bg-surface-container-low/50"
                        >
                          <span>{faq.q}</span>
                          {isExpanded ? <ChevronUp size={16} className="text-primary shrink-0" /> : <ChevronDown size={16} className="text-on-surface-variant shrink-0" />}
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3.5 text-xs text-on-surface-variant leading-relaxed border-t border-outline-variant/40 pt-2 bg-surface/40 animate-in fade-in duration-100">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Support Ticket */}
              <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-on-surface text-sm">Submit a Direct Support Ticket</h4>
                    <p className="text-xs text-on-surface-variant">Our Cooperative Officer team responds within 2 business hours.</p>
                  </div>
                  <Mail size={18} className="text-primary" />
                </div>

                <form onSubmit={handleTicketSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">Your Full Name *</label>
                      <input
                        type="text"
                        required
                        value={ticketForm.name}
                        onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">Email or Phone *</label>
                      <input
                        type="text"
                        required
                        value={ticketForm.email}
                        onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
                        placeholder="e.g. ramesh@gmail.com or 9876543210"
                        className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">Issue Category</label>
                    <select
                      value={ticketForm.category}
                      onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
                    >
                      <option value="Payment/Escrow">Payment & Escrow Refund</option>
                      <option value="Service Quality">Service Quality & Dispute</option>
                      <option value="Provider Verification">Provider Verification / e-Shram</option>
                      <option value="Cooperative Membership">Cooperative Membership & Governance</option>
                      <option value="Other">Other Query</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">Detailed Description *</label>
                    <textarea
                      rows={3}
                      required
                      value={ticketForm.message}
                      onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                      placeholder="Describe your issue or query clearly..."
                      className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-outline-variant text-on-surface focus:outline-none focus:border-primary resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Submitting Ticket...</span>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Submit Support Ticket</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <CheckCircle size={14} className="text-emerald-500" />
            <span>Multi-State Cooperative Societies Act, 2002 Compliant</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-surface border border-outline-variant font-semibold text-on-surface hover:bg-surface-container transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
