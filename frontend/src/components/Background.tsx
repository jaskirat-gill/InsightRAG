import { FC } from 'react';

interface BackgroundProps {
    theme: 'dark' | 'light';
}

const Background: FC<BackgroundProps> = ({ theme }) => {
    return (
        <div
            className="fixed inset-0 -z-10"
            style={{ backgroundColor: theme === 'light' ? '#ffffff' : '#0f172a' }}
        />
    );
};

export default Background;
