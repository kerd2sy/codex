export interface OcrResult {
    batch: string;
    expiry: string;
}

import * as ImageManipulator from 'expo-image-manipulator';

interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
    class: string;
    confidence: number;
}

export const uploadToRoboflow = async (
    base64Image: string,
    batchBox: BoundingBox | null,
    expiryBox: BoundingBox | null
) => {
    try {
        const apiKey = process.env.EXPO_PUBLIC_ROBOFLOW_API_KEY;
        const modelUrl = process.env.EXPO_PUBLIC_ROBOFLOW_MODEL;
        
        if (!apiKey || !modelUrl) return;
        
        const project = modelUrl.split('/')[0];
        
        console.log(`[Roboflow Active Learning] Uploading image to project: ${project}`);
        const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, "");
        
        // 1. Upload image
        const uploadUrl = `https://api.roboflow.com/dataset/${project}/upload?api_key=${apiKey}&name=active_learning_${Date.now()}.jpg&split=train`;
        
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: cleanBase64
        });
        
        if (!response.ok) {
            console.error("[Roboflow Upload Error]", await response.text());
            return;
        }
        
        const data = await response.json();
        const imageId = data.id;
        console.log(`[Roboflow] Image uploaded successfully! ID: ${imageId}`);
        
        // 2. Upload annotations
        const annotations = [];
        if (batchBox) annotations.push(batchBox);
        if (expiryBox) annotations.push(expiryBox);
        
        if (annotations.length > 0) {
            const annotateUrl = `https://api.roboflow.com/dataset/${project}/annotate/${imageId}?api_key=${apiKey}&name=active_learning_${Date.now()}.jpg`;
            
            const annResponse = await fetch(annotateUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ annotations })
            });
            
            if (annResponse.ok) {
                console.log("[Roboflow] Annotations uploaded successfully!");
            } else {
                console.error("[Roboflow Annotate Error]", await annResponse.text());
            }
        }
    } catch (e) {
        console.error("[Roboflow Active Learning Exception]", e);
    }
};

const detectWithRoboflow = async (base64Image: string): Promise<BoundingBox[] | null> => {
    try {
        const apiKey = process.env.EXPO_PUBLIC_ROBOFLOW_API_KEY;
        const model = process.env.EXPO_PUBLIC_ROBOFLOW_MODEL; // e.g. "medicine_data_detection/3"
        
        if (!apiKey || !model) return null;

        // Roboflow requires raw base64 via POST body, no data:image prefix
        // But since we have it, we just send it.
        const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, "");

        const response = await fetch(`https://detect.roboflow.com/${model}?api_key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: cleanBase64
        });

        if (!response.ok) {
            console.log("[Roboflow] Error:", response.status);
            return null;
        }

        const data = await response.json();
        return data.predictions as BoundingBox[];
    } catch (e) {
        console.log("[Roboflow] Exception:", e);
        return null;
    }
}

const cropImage = async (imageUri: string, box: BoundingBox) => {
    // Roboflow returns x,y as CENTER coordinates. ImageManipulator needs top-left.
    const originX = Math.max(0, box.x - box.width / 2);
    const originY = Math.max(0, box.y - box.height / 2);
    
    // Add some padding to capture edges
    const pad = 15;
    const finalX = Math.max(0, originX - pad);
    const finalY = Math.max(0, originY - pad);
    const finalW = box.width + (pad * 2);
    const finalH = box.height + (pad * 2);

    const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: { originX: finalX, originY: finalY, width: finalW, height: finalH } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return result;
}

/**
 * Sends a captured image to ocr.space and extracts Expiry Date & Batch Number
 * @param imageUri Local image URI from expo-image-picker
 * @returns Extracted OcrResult
 */
export const performOcr = async (
    imageUri: string, 
    cropTarget: 'batch' | 'expiry' | 'none' = 'none',
    base64Data?: string
): Promise<OcrResult> => {
    try {
        console.log(`[OCR] Starting process... (Target: ${cropTarget})`);

        // If this is the FIRST run (not a recursive crop), try Roboflow!
        if (cropTarget === 'none' && base64Data) {
            console.log("[OCR] Attempting Roboflow Detection...");
            const predictions = await detectWithRoboflow(base64Data);
            
            if (predictions && predictions.length > 0) {
                console.log("[Roboflow] Found boxes:", predictions.map(p => p.class));
                
                const batchPred = predictions.filter(p => p.class.toLowerCase().includes('batch')).sort((a,b) => b.confidence - a.confidence)[0];
                const expiryPred = predictions.filter(p => p.class.toLowerCase().includes('exp') || p.class.toLowerCase().includes('date') || p.class.toLowerCase().includes('صلاحية')).sort((a,b) => b.confidence - a.confidence)[0];

                let finalBatch = '';
                let finalExpiry = '';

                // If found, crop and run OCR space!
                if (batchPred) {
                    console.log("[Roboflow] Cropping Batch...");
                    const batchCrop = await cropImage(imageUri, batchPred);
                    if (batchCrop.base64) {
                        const batchRes = await performOcr(batchCrop.uri, 'batch', batchCrop.base64);
                        finalBatch = batchRes.batch;
                    }
                }
                
                if (expiryPred) {
                    console.log("[Roboflow] Cropping Expiry...");
                    const expiryCrop = await cropImage(imageUri, expiryPred);
                    if (expiryCrop.base64) {
                        const expRes = await performOcr(expiryCrop.uri, 'expiry', expiryCrop.base64);
                        finalExpiry = expRes.expiry;
                    }
                }

                if (finalBatch || finalExpiry) {
                    return { batch: finalBatch, expiry: finalExpiry };
                }
            }
        }
        
        console.log("[OCR] Preparing image upload to OCR.space...");
        
        const formData = new FormData();
        // Using OCR.space helloworld key for demo/rate-limited queries, 
        formData.append('apikey', 'K88722956288957');
        formData.append('OCREngine', '2'); // Engine 2 is much better for numbers and dot matrix
        
        if (base64Data) {
            formData.append('base64Image', `data:image/jpeg;base64,${base64Data}`);
        } else {
            formData.append('file', {
                uri: imageUri,
                name: 'receipt.jpg',
                type: 'image/jpeg'
            } as any);
        }
        
        formData.append('language', 'eng'); // Dates and numbers are generally english/numeric
        formData.append('isOverlayRequired', 'false');
        formData.append('scale', 'true');
        formData.append('detectOrientation', 'true');
        formData.append('isTable', 'true'); // Important for receipts

        // console.log("[OCR] Sending request to OCR.space API...");
        const response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'multipart/form-data',
            },
        });
 
        if (!response.ok) {
            throw new Error(`OCR Server returned status: ${response.status}`);
        }
 
        const data = await response.json();
        // console.log("[OCR] API Response:", JSON.stringify(data).slice(0, 300));
 
        if (data.IsErroredOnProcessing) {
            throw new Error(`OCR Error: ${data.ErrorMessage[0]}`);
        }
 
        if (data.ParsedResults && data.ParsedResults.length > 0) {
            const parsedText = data.ParsedResults[0].ParsedText || '';
            // console.log("[OCR] Parsed Text:", parsedText);
 
            return parseOcrText(parsedText, cropTarget);
        }
        
        throw new Error("No text parsed from image");
    } catch (error) {
        console.error("[OCR] Critical error during OCR processing:", error);
        throw error;
    }
};

const translateArabicNumerals = (text: string): string => {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    let result = text;
    for (let i = 0; i < 10; i++) {
        const regex = new RegExp(arabicDigits[i], 'g');
        result = result.replace(regex, i.toString());
    }
    return result;
};

/**
 * Parses raw text from OCR to extract Batch Number & Expiry Date using Regular Expressions
 * @param text The parsed string from the OCR engine
 */
export const parseOcrText = (
    text: string, 
    cropTarget: 'batch' | 'expiry' | 'none' = 'none'
): OcrResult => {
    let batch = '';
    let expiry = '';
 
    // Translate eastern Arabic numerals to standard digits (e.g. ٢٠٢٨ -> 2028)
    let normalizedText = translateArabicNumerals(text);
    console.log("[OCR] Normalized Text:", normalizedText);

    // Strip out Production/Manufacturing dates to prevent them from being mistaken as Expiry Dates
    normalizedText = normalizedText.replace(/(?:prod|mfg|m\.f\.g|pr|إنتاج|انتاج)\s*[:\-\.\s]*\b(?:0[1-9]|1[0-2])[\/\-\.\s\:\\\|l1]+(?:20[2-3][0-9]|[2-3][0-9])\b/gi, ' ');

    // If this is a cropped target, we know the cropped image contains ONLY that item!
    // So we can bypass the strict regex and capture it directly!
    if (cropTarget === 'batch') {
        const cleanBatch = normalizedText.replace(/[^a-zA-Z0-9]/g, '').trim().toUpperCase();
        if (cleanBatch.length >= 2) {
            return { batch: cleanBatch, expiry: '' };
        }
    }

    if (cropTarget === 'expiry') {
        // Strip out non-alphanumeric to find date
        const digits = normalizedText.replace(/[^0-9]/g, '').trim();
        if (/^\d{3,4}$/.test(digits)) {
            return { batch: '', expiry: digits }; // Will be shorthand parsed in dashboard
        }
    }
 
    // Split text into lines for granular matching (handles cases where OCR returns \r without \n)
    const lines = normalizedText.replace(/\r/g, '\n').split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // 1. MATCH EXPIRY DATE
    // Search with priority for lines that contain indicators like EXP, Expiry, Validity, تاريخ, صلاحية
    const dateKeywords = ['exp', 'expiry', 'valid', 'val', 'صلاح', 'تاريخ', 'ينتهي', 'غاية', 'تا', 'ص'];
    
    // First pass: look for lines containing date keywords
    for (const line of lines) {
        const lowerLine = line.toLowerCase();
        const hasKeyword = dateKeywords.some(keyword => lowerLine.includes(keyword));
        
        if (hasKeyword) {
            // Find MM/YY or MM/YYYY or YYYY/MM with flexible separators
            // Separator can be /, -, ., space, |, \, or even misread slashes like 1 or l
            const match = lowerLine.match(/\b(0[1-9]|1[0-2])[\/\-\.\s\:\\\|l1]+(20[2-3][0-9]|[2-3][0-9])\b/) ||
                          lowerLine.match(/\b(20[2-3][0-9]|[2-3][0-9])[\/\-\.\s\:\\\|l1]+(0[1-9]|1[0-2])\b/);
            
            if (match) {
                let month = match[1];
                let year = match[2];
                
                // Swap if year was detected first
                if (month.length === 4 || (month.length === 2 && parseInt(month, 10) > 12)) {
                    const temp = month;
                    month = year;
                    year = temp;
                }
                
                if (year.length === 2) {
                    year = '20' + year;
                }
                
                expiry = `${year}-${month.padStart(2, '0')}-01`;
                break;
            }
        }
    }

    // Second pass: if no expiry found, search all lines for any standalone date format
    if (!expiry) {
        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            const match = lowerLine.match(/\b(0[1-9]|1[0-2])[\/\-\.\s\:\\\|l1]+(20[2-3][0-9]|[2-3][0-9])\b/) ||
                          lowerLine.match(/\b(20[2-3][0-9]|[2-3][0-9])[\/\-\.\s\:\\\|l1]+(0[1-9]|1[0-2])\b/);
            
            if (match) {
                let month = match[1];
                let year = match[2];
                
                if (month.length === 4 || (month.length === 2 && parseInt(month, 10) > 12)) {
                    const temp = month;
                    month = year;
                    year = temp;
                }
                
                if (year.length === 2) {
                    year = '20' + year;
                }
                
                expiry = `${year}-${month.padStart(2, '0')}-01`;
                break;
            }
        }
    }

    // Third pass: check for contiguous digits (e.g. 092028 or 0928 or 09128 where 1 is misread slash)
    if (!expiry) {
        for (const line of lines) {
            const digitsMatch = line.match(/\b(\d{4,8})\b/);
            if (digitsMatch) {
                const digits = digitsMatch[1];
                if (digits.length === 4) {
                    // MMYY
                    const month = parseInt(digits.slice(0, 2), 10);
                    const year = parseInt(digits.slice(2), 10);
                    if (month >= 1 && month <= 12 && year >= 20 && year <= 39) {
                        expiry = `20${year}-${digits.slice(0, 2)}-01`;
                        break;
                    }
                } else if (digits.length === 5) {
                    // MM1YY (e.g. 09128 where 1 is slash)
                    const month = parseInt(digits.slice(0, 2), 10);
                    const year = parseInt(digits.slice(3), 10);
                    if (month >= 1 && month <= 12 && year >= 20 && year <= 39) {
                        expiry = `20${year}-${digits.slice(0, 2)}-01`;
                        break;
                    }
                } else if (digits.length === 6) {
                    // MMYYYY
                    const month = parseInt(digits.slice(0, 2), 10);
                    const year = parseInt(digits.slice(2), 10);
                    if (month >= 1 && month <= 12 && year >= 2020 && year <= 2039) {
                        expiry = `${year}-${digits.slice(0, 2)}-01`;
                        break;
                    }
                } else if (digits.length === 7) {
                    // MM1YYYY (e.g. 0912028)
                    const month = parseInt(digits.slice(0, 2), 10);
                    const year = parseInt(digits.slice(3), 10);
                    if (month >= 1 && month <= 12 && year >= 2020 && year <= 2039) {
                        expiry = `${year}-${digits.slice(0, 2)}-01`;
                        break;
                    }
                }
            }
        }
    }

    // 2. MATCH BATCH NUMBER
    // First pass: look for batch keywords in the full text (handles line breaks between keyword and value)
    const fullText = normalizedText.replace(/\n/g, ' ');
    const batchKeywords = ['b.n', 'b.no', 'bn', 'batch', 'lot', 'b/n', 'ch.b', 'ch', 'تشغيلة', 'رقم', 'باتش', 'الحصة'];
    const hasBatchKeyword = batchKeywords.some(keyword => fullText.toLowerCase().includes(keyword));
    
    if (hasBatchKeyword) {
        const match = fullText.match(/(?:b\.?n\.?|b\.?no\.?|batch(?:[\s_]*(?:no|number)\.?)?|lot(?:[\s_]*(?:no|number)\.?)?|b\/n|ch\.?b\.?|ch|تشغيلة|رقم|باتش|الحصة)\s*[:\-\s\.]*\s*([a-zA-Z0-9]{2,15})/i);
        if (match && match[1]) {
            let val = match[1].trim();
            
            // If it accidentally captures "no" or "number" because of weird spacing, fix it
            if (val.toLowerCase() === 'no' || val.toLowerCase() === 'number') {
                const nextMatch = fullText.match(new RegExp(val + "\\s*[:\\-\\s\\.]*\\s*([a-zA-Z0-9]{2,15})", "i"));
                if (nextMatch && nextMatch[1]) {
                    val = nextMatch[1].trim();
                }
            }

            // Filter out standard years or dates or the word "Date"
            if (!/^(202[0-9]|203[0-9]|[2-3][0-9]|date|price)$/i.test(val)) {
                batch = val.toUpperCase();
            }
        }
    }

    // Second pass: if no batch found, fall back to any uppercase alphanumeric token between 4 and 10 chars
    if (!batch) {
        for (const line of lines) {
            // Remove special chars and check line tokens
            const tokens = line.split(/[\s\:\-\,\.\/]/).map(t => t.trim()).filter(t => t.length >= 4 && t.length <= 10);
            for (const token of tokens) {
                const cleanToken = token.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                if (
                    cleanToken.length >= 4 &&
                    cleanToken.length <= 10 &&
                    /^[A-Z0-9]+$/.test(cleanToken) &&
                    !/^(202[0-9]|203[0-9])$/.test(cleanToken) && // Not a year
                    !/^(0[1-9]|1[0-2])(20[2-3][0-9]|[2-3][0-9])$/.test(cleanToken) && // Not a date MMYY / MMYYYY
                    !/^(BATCH|LOT|DATE|PRICE|STRIP|MFG|EXP|PROD)$/i.test(cleanToken)
                ) {
                    // Skip small integer numbers
                    if (/^\d+$/.test(cleanToken) && cleanToken.length < 5) {
                        continue;
                    }
                    batch = cleanToken;
                    break;
                }
            }
            if (batch) break;
        }
    }

    return { batch, expiry };
};
