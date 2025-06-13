"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  const imageRef = useRef(null);
  const demoVideoRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Scroll animation
  useEffect(() => {
    const imageElement = imageRef.current;
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const threshold = 100;
      if (imageElement) {
        if (scrollY > threshold) {
          imageElement.classList.add("scale-105", "opacity-90");
        } else {
          imageElement.classList.remove("scale-105", "opacity-90");
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Play/pause demo video
  useEffect(() => {
    const video = demoVideoRef.current;
    if (isModalOpen) {
      video?.play();
    } else {
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    }
  }, [isModalOpen]);

  return (
    <section className="bg-gray-50 pt-40 pb-20 px-4">
      <div className="container mx-auto text-center">
        {/* Header */}
        <h1 className="text-5xl md:text-8xl lg:text-[105px] font-bold pb-6 bg-gradient-to-r from-indigo-600 to-emerald-500 bg-clip-text text-transparent">
          Manage Your Finances <br /> with Intelligence
        </h1>

        {/* Subtext */}
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          An AI-powered financial management platform that helps you track,
          analyze, and optimize your spending with real-time insights.
        </p>

        {/* Buttons */}
        <div className="flex justify-center space-x-4 mb-10">
          <Link href="/dashboard">
            <Button size="lg" className="px-8 bg-indigo-600 hover:bg-indigo-700 text-white">
              Get Started
            </Button>
          </Link>
          <Button
            size="lg"
            variant="outline"
            className="px-8 border border-gray-300 text-gray-800 hover:border-indigo-600 hover:text-indigo-600"
            onClick={() => setIsModalOpen(true)}
          >
            Watch Demo
          </Button>
        </div>

        {/* Image */}
        <div className="hero-image-wrapper mt-5 md:mt-0 transition-all duration-500 ease-in-out">
          <div ref={imageRef} className="hero-image">
            <Image
              src="/banner.jpeg"
              width={1280}
              height={720}
              alt="Dashboard Preview"
              className="rounded-lg shadow-2xl border mx-auto transition-transform duration-500 ease-in-out"
              priority
            />
          </div>
        </div>
      </div>

      {/* Demo Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg max-w-3xl w-full p-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-700 hover:text-gray-900 text-2xl font-bold"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close demo video modal"
            >
              &times;
            </button>
            <h2 className="text-xl font-semibold mb-4 text-center">
              Watch Demo
            </h2>
            <video
              ref={demoVideoRef}
              controls
              className="w-full rounded-lg"
              muted={false}
              playsInline
              poster="/video-poster.jpg"
            >
              <source src="/video.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
