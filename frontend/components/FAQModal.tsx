'use client';

import { useState } from 'react';

interface FAQModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const faqs = [
  {
    question: 'What is Monad Coin Flip?',
    answer: 'Monad Coin Flip is a provably fair coin flip game built on the Monad blockchain. It uses Pyth Entropy to generate verifiable random numbers, ensuring complete fairness and transparency in every game.',
  },
  {
    question: 'How does the randomness work?',
    answer: 'We use Pyth Entropy, a cutting-edge on-chain randomness solution. The randomness is generated using both user-provided randomness and provider-generated randomness, making it impossible to predict or manipulate the outcome.',
  },
  {
    question: 'What wallets are supported?',
    answer: 'We currently support MetaMask and Phantom wallet. Simply click "Connect Wallet" and choose your preferred wallet to get started.',
  },
  {
    question: 'What are the betting limits?',
    answer: 'The minimum bet is 0.01 MON and the maximum bet is 1 MON per game. These limits help ensure fair play and manage risk.',
  },
  {
    question: 'What is the payout rate?',
    answer: 'When you win, you receive 1.9x your bet amount. The house takes a 5% fee to maintain the platform and cover gas costs.',
  },
  {
    question: 'How do I switch to Monad Testnet?',
    answer: 'If you\'re on the wrong network, click the "Switch to Monad" button that appears when you connect your wallet. Your wallet will prompt you to add and switch to the Monad Testnet network.',
  },
  {
    question: 'How long does it take to see results?',
    answer: 'Results are typically revealed within a few seconds after placing your bet. The exact time depends on network conditions and the Pyth Entropy provider.',
  },
  {
    question: 'Is this real money?',
    answer: 'No! This is running on Monad Testnet, which uses test tokens (MON) that have no real-world value. This is for testing and demonstration purposes only.',
  },
  {
    question: 'Can I see my betting history?',
    answer: 'Yes! Once you connect your wallet, you\'ll see your complete game history below the coin flip interface, showing all your past bets, results, and payouts.',
  },
  {
    question: 'What happens if my transaction fails?',
    answer: 'If your transaction fails, your bet amount will not be deducted. Common reasons include insufficient balance, network issues, or rejected transactions. You can try again once the issue is resolved.',
  },
];

export function FAQModal({ isOpen, onClose }: FAQModalProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const toggleQuestion = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">❓</span>
            <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-6">
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => toggleQuestion(index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="font-semibold text-gray-900 dark:text-white pr-4">
                    {faq.question}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform flex-shrink-0 ${
                      expandedIndex === index ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedIndex === index && (
                  <div className="px-6 pb-4 text-gray-700 dark:text-gray-300">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
