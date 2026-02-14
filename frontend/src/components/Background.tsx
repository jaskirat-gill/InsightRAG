import { FC } from 'react';


const Background: FC = () => {
    return (
        <div className="fixed inset-0 -z-10 bg-background overflow-hidden">
            {/* Gradient Orbs */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow mix-blend-screen" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] animate-pulse-slow delay-1000 mix-blend-screen" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-secondary/10 rounded-full blur-[150px] animate-pulse-slow delay-2000 mix-blend-screen" />

            {/* Grid Pattern Overlay */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.1) 1px, transparent 0)`,
                    backgroundSize: '40px 40px'
                }}
            />
        </div>
    );
};

export default Background;
