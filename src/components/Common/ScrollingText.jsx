"use client";

import React from "react";

const ScrollingText = () => {
  const scrollContent = (
    <>
      <span className="text-gray-500 text-sm">NARASARAOPETA ENGINEERING COLLEGE [NEC]</span>
      <span className="text-purple-500">•</span>
      <span className="text-gray-500 text-sm">NARASARAOPETA ENGINEERING COLLEGE [NEC]</span>
      <span className="text-purple-500">•</span>
      <span className="text-gray-500 text-sm">NARASARAOPETA ENGINEERING COLLEGE [NEC]</span>
      <span className="text-purple-500">•</span>
      <span className="text-gray-500 text-sm">NARASARAOPETA ENGINEERING COLLEGE [NEC]</span>
      <span className="text-purple-500">•</span>
      <span className="text-gray-500 text-sm">NARASARAOPETA ENGINEERING COLLEGE [NEC]</span>
      <span className="text-purple-500">•</span>
    </>
  );

  return (
    <div className="w-full bg-gradient-to-r from-black via-black/95 to-black overflow-hidden py-2">
      <div className="animate-scroll-x flex whitespace-nowrap">
        {/* Create multiple instances for continuous scrolling */}
        <div className="flex space-x-4 mx-4">
          {scrollContent}
        </div>
        <div className="flex space-x-4 mx-4">
          {scrollContent}
        </div>
        <div className="flex space-x-4 mx-4">
          {scrollContent}
        </div>
      </div>
    </div>
  );
};

export default ScrollingText;