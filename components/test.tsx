"use client"
import React, { useEffect, useRef, useState } from 'react';
import AudioMotionAnalyzer from 'audiomotion-analyzer';

export default function AudioVisualizer() {
    const containerRef = useRef(null);
    const audioMotionRef = useRef(null);
    const micStreamRef = useRef(null);
    const [isMicOn, setIsMicOn] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Initialize analyzer
        if (containerRef.current && !audioMotionRef.current) {
            audioMotionRef.current = new AudioMotionAnalyzer(containerRef.current, {
                gradient: 'rainbow',
                height: window.innerHeight - 80,
                showScaleY: true
            });
        }

        // Cleanup on unmount
        return () => {
            if (audioMotionRef.current) {
                if (micStreamRef.current) {
                    audioMotionRef.current.disconnectInput(micStreamRef.current, true);
                }
                audioMotionRef.current.destroy();
                audioMotionRef.current = null;
            }
        };
    }, []);

    const toggleMicrophone = async () => {
        if (!audioMotionRef.current) {
            setError('Audio visualizer not initialized');
            return;
        }

        if (!isMicOn) {
            // Turn microphone ON
            if (navigator.mediaDevices) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: false
                    });

                    // Create stream using audioMotion audio context
                    micStreamRef.current = audioMotionRef.current.audioCtx.createMediaStreamSource(stream);

                    // Connect microphone stream to analyzer
                    audioMotionRef.current.connectInput(micStreamRef.current);

                    // Mute output to prevent feedback loops
                    audioMotionRef.current.volume = 0;

                    setIsMicOn(true);
                    setError('');
                } catch (err) {
                    console.error('Microphone access error:', err);
                    setError('Microphone access denied by user');
                }
            } else {
                setError('User mediaDevices not available');
            }
        } else {
            // Turn microphone OFF
            if (micStreamRef.current) {
                audioMotionRef.current.disconnectInput(micStreamRef.current, true);
                micStreamRef.current = null;
            }
            setIsMicOn(false);
        }
    };

    return (
        <div className="w-full h-screen bg-black">
            {/* Analyzer container */}
            <div ref={containerRef} className="w-full" />

            {/* Controls */}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-4 flex items-center justify-between">
                <label className="inline-flex items-center cursor-pointer bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg transition-colors">
                    <input
                        type="checkbox"
                        checked={isMicOn}
                        onChange={toggleMicrophone}
                        className="hidden"
                    />
                    <span className="text-white font-medium">
                        🎤 {isMicOn ? 'ON' : 'OFF'}
                    </span>
                </label>

                <div className="text-white text-sm">
                    {error && (
                        <span className="text-red-400 mr-4">{error}</span>
                    )}
                    <a
                        href="https://audiomotion.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                    >
                        audioMotion-analyzer
                    </a>
                    <span className="ml-2 text-gray-400">v{AudioMotionAnalyzer.version}</span>
                </div>
            </div>
        </div>
    );
}