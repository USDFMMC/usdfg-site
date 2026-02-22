// Tokenomics component

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "../styles/Tokenomics.css";

const Tokenomics = () => {
    const sectionRef = useRef(null);
    const [val1, setVal1] = useState(0);
    const [val2, setVal2] = useState(0);
    const [val3, setVal3] = useState(0);
    const [val4, setVal4] = useState(0);

    const animateCount = (target, setter, duration, idx) => {
        const start = performance.now();
        let frame;

        const animate = now => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            setter(Math.floor(progress * target));

            if (progress < 1) {
                frame = requestAnimationFrame(animate);
            } else {
                setter(target);
            }
        };
        return animate;
    };

    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    requestAnimationFrame(animateCount(100, setVal1, 3000, 0));
                    requestAnimationFrame(animateCount(200, setVal2, 3000, 1));
                    requestAnimationFrame(animateCount(50, setVal3, 3000, 2));
                    requestAnimationFrame(animateCount(30, setVal4, 3000, 3));
                    observer.disconnect();
                }
            });
        });
        observer.observe(sectionRef.current);

        return () => observer.disconnect();
    }, []);

    return (
        <section ref={sectionRef} className="tokenomics">
            <h2>Tokenomics</h2>
            <p>Our vision is to engage the community inclusively through broader participation while avoiding financial return mechanisms.</p>
            <div className="count-box">
               Counts: {val1}-{val2}-{val3}
             <div className='card description you'd module.>
    </section>
);

export default Tokenomics;