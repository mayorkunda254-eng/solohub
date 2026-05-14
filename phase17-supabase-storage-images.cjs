const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-storage-upload.jsx", code);

function findFunctionBlock(functionName) {
  const startRegex = new RegExp(`function\\s+${functionName}\\s*\\(`);
  const match = startRegex.exec(code);

  if (!match) throw new Error(`Could not find function ${functionName}`);

  const start = match.index;
  const openParen = code.indexOf("(", start);

  let parenDepth = 0;
  let closeParen = -1;

  for (let i = openParen; i < code.length; i++) {
    if (code[i] === "(") parenDepth++;
    if (code[i] === ")") parenDepth--;

    if (parenDepth === 0) {
      closeParen = i;
      break;
    }
  }

  const braceStart = code.indexOf("{", closeParen);
  let depth = 0;

  for (let i = braceStart; i < code.length; i++) {
    if (code[i] === "{") depth++;
    if (code[i] === "}") depth--;

    if (depth === 0) {
      return { start, end: i + 1 };
    }
  }

  throw new Error(`Could not find end of function ${functionName}`);
}

// Add upload helper
if (!code.includes("async function uploadCampaignImageFile")) {
  code += `

async function uploadCampaignImageFile(file) {
  if (!file) {
    throw new Error("No image file selected.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload an image file.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image is too large. Maximum size is 5MB.");
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id || "public";

  const safeName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-");

  const path = \`campaigns/\${userId}/\${Date.now()}-\${safeName}\`;

  const { error } = await supabase.storage
    .from("campaign-assets")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from("campaign-assets")
    .getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error("Image uploaded but public URL was not returned.");
  }

  return data.publicUrl;
}
`;
}

const block = findFunctionBlock("CreateCampaignPage");
let fn = code.slice(block.start, block.end);

// Add uploading state
if (!fn.includes("uploadingImage")) {
  fn = fn.replace(
    `const [submittingCampaign, setSubmittingCampaign] = useState(false);`,
    `const [submittingCampaign, setSubmittingCampaign] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);`
  );
}

// Add upload handler after update function
if (!fn.includes("const handleImageUpload")) {
  fn = fn.replace(
/  const update = \(key, value\) => \{[\s\S]*?  \};/,
`  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploadingImage(true);

    try {
      const publicUrl = await uploadCampaignImageFile(file);
      update('imageUrl', publicUrl);
      alert('Campaign image uploaded successfully.');
    } catch (err) {
      console.error('Campaign image upload failed:', err);
      alert('Image upload failed: ' + (err?.message || err));
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };`
  );
}

// Add file input below campaign image URL
if (!fn.includes("Upload campaign image")) {
  fn = fn.replace(
`          <label>
            Campaign image URL
            <input value={form.imageUrl} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://example.com/banner.jpg" />
          </label>`,
`          <label>
            Campaign image URL
            <input value={form.imageUrl} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://example.com/banner.jpg" />
          </label>

          <label className="upload-field">
            Upload campaign image
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImageUpload} />
            <span className="form-note">Recommended: 1200×700 image, under 5MB.</span>
          </label>`
  );
}

// Update submit button disabled/text
fn = fn.replace(
`<Button type="button" onClick={submit} disabled={submittingCampaign}>
            {submittingCampaign ? 'Submitting...' : 'Submit campaign for approval'}
          </Button>`,
`<Button type="button" onClick={submit} disabled={submittingCampaign || uploadingImage}>
            {uploadingImage ? 'Uploading image...' : submittingCampaign ? 'Submitting...' : 'Submit campaign for approval'}
          </Button>`
);

code = code.slice(0, block.start) + fn + code.slice(block.end);

fs.writeFileSync(file, code);
console.log("? Supabase Storage image upload added to Create Campaign.");
