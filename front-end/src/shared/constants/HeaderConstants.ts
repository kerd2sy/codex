import { Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * 1% of screen height for the gap between status bar and header content
 * as requested by the user.
 */
export const HEADER_TOP_GAP = 0;

/**
 * Standard content height for headers (excluding padding/top gap).
 */
export const HEADER_CONTENT_HEIGHT = 52;

/**
 * Total header height including status bar inset and gap.
 * Usage: headerHeight: HEADER_TOTAL_HEIGHT(insets.top)
 */
export const HEADER_TOTAL_HEIGHT = (statusBarHeight: number) => 
    HEADER_CONTENT_HEIGHT + statusBarHeight + HEADER_TOP_GAP;
