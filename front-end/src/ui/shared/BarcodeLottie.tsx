import React, { useRef } from 'react';
import LottieView from 'lottie-react-native';
import { StyleProp, ViewStyle } from 'react-native';

interface BarcodeLottieProps {
    style?: StyleProp<ViewStyle>;
}

export default function BarcodeLottie({ style }: BarcodeLottieProps) {
    const lottieRef = useRef<LottieView>(null);

    return (
        <LottieView
            ref={lottieRef}
            source={require('@/assets/json/Barcode.json')}
            autoPlay
            loop={false}
            style={style || { width: 40, height: 40 }}
            onAnimationFinish={(isCancelled) => {
                if (!isCancelled) {
                    // Loop the animation from frame 60 to 480
                    // This skips the initial drawing of the QR code frame
                    // and just loops the laser going up and down
                    lottieRef.current?.play(60, 480);
                }
            }}
        />
    );
}
