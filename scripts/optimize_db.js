const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
const PHOTO_DIR = path.join(process.cwd(), 'public', 'uploads', 'profile_photos');
const DOC_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents');

if (!fs.existsSync(PHOTO_DIR)) fs.mkdirSync(PHOTO_DIR, { recursive: true });
if (!fs.existsSync(DOC_DIR)) fs.mkdirSync(DOC_DIR, { recursive: true });

console.log('Starting full database optimization...');

try {
    const dbRaw = fs.readFileSync(DB_FILE, 'utf-8');
    const db = JSON.parse(dbRaw);

    let changed = false;

    // 1. Optimize Photos
    if (db.employees) {
        db.employees = db.employees.map((emp) => {
            if (emp.profile_picture && emp.profile_picture.startsWith('data:image/')) {
                try {
                    const matches = emp.profile_picture.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
                    if (matches && matches.length === 3) {
                        const extension = matches[1];
                        const base64Data = matches[2];
                        const buffer = Buffer.from(base64Data, 'base64');
                        const filename = `profile_${emp.id}_${Date.now()}.${extension}`;
                        fs.writeFileSync(path.join(PHOTO_DIR, filename), buffer);

                        emp.profile_picture = `/uploads/profile_photos/${filename}`;
                        changed = true;
                        console.log(`Optimized photo: Employee ${emp.id}`);
                    }
                } catch (err) { console.error('Photo error:', err); }
            }
            return emp;
        });
    }

    // 2. Optimize Documents
    if (db.documents) {
        db.documents = db.documents.map((doc) => {
            // Check if it has blobs (file_data) but no file_path
            if (doc.file_data && !doc.file_path) {
                try {
                    let rawData = doc.file_data;
                    let buffer = null;

                    // Handle various serialized buffer formats
                    if (Buffer.isBuffer(rawData)) {
                        buffer = rawData;
                    } else if (rawData.type === 'Buffer' && Array.isArray(rawData.data)) {
                        buffer = Buffer.from(rawData.data);
                    } else if (Array.isArray(rawData)) { // Sometimes raw array
                        buffer = Buffer.from(rawData);
                    } else if (typeof rawData === 'object' && Array.isArray(rawData.data)) {
                        /* Generic object with data array */
                        buffer = Buffer.from(rawData.data);
                    }

                    if (buffer) {
                        // Use existing filename or generate one
                        const safeName = (doc.document_name || `doc_${Date.now()}.bin`).replace(/[^a-zA-Z0-9.-]/g, '_');
                        const filename = `optimized_${Date.now()}_${safeName}`;

                        fs.writeFileSync(path.join(DOC_DIR, filename), buffer);

                        doc.file_path = `/uploads/documents/${filename}`;
                        doc.file_data = null; // Clear blob
                        changed = true;
                        console.log(`Optimized document: ${doc.document_name}`);
                    }
                } catch (err) { console.error(`Document error for ${doc.document_name}:`, err); }
            }
            return doc;
        });
    }

    if (changed) {
        console.log('Saving optimized database...');
        // Write file with minimal indentation to save space? Or stick to 2 spaces. 
        // 2 spaces is fine if blobs are gone.
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        console.log('Database saved.');
    } else {
        console.log('No changes needed.');
    }

} catch (error) {
    console.error('Optimization failed:', error);
}
