const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

// Add submitting state after step state
code = code.replace(
  "const [step, setStep] = useState(1);",
  `const [step, setStep] = useState(1);
  const [submittingCampaign, setSubmittingCampaign] = useState(false);`
);

// Replace old submit function
code = code.replace(
`  const submit = (e) => {
    e.preventDefault();
    if (!canGoNext()) return;
    onCreateCampaign({
      ...form,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now(),
      remaining: Number(form.budget || 0),
      beginnerFriendly: true,
      verified: false,
      score: 70,
      status: 'Pending Approval',
      platforms: form.platforms.split(',').map((x) => x.trim()).filter(Boolean),
      rules: form.rules.split('\\n').map((x) => x.trim()).filter(Boolean),
      hashtags: form.hashtags.split(',').map((x) => x.trim()).filter(Boolean),
      assets: ['Source link/assets to be added']
    });
    setForm((prev) => ({ ...prev, title: '', description: '' }));
    setStep(1);
  };`,
`  const submit = async (e) => {
    e.preventDefault();
    if (step !== 4) return;
    if (!form.title.trim() || !form.description.trim()) return;

    setSubmittingCampaign(true);

    await onCreateCampaign({
      ...form,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now(),
      remaining: Number(form.budget || 0),
      beginnerFriendly: true,
      verified: false,
      score: 70,
      status: 'Pending Approval',
      platforms: form.platforms.split(',').map((x) => x.trim()).filter(Boolean),
      rules: form.rules.split('\\n').map((x) => x.trim()).filter(Boolean),
      hashtags: form.hashtags.split(',').map((x) => x.trim()).filter(Boolean),
      assets: ['Source link/assets to be added']
    });

    setSubmittingCampaign(false);
  };`
);

// Update submit button text and disabled state
code = code.replace(
`<Button type="submit" disabled={!form.title.trim() || !form.description.trim()}><CheckCircle2 size={18} /> Submit campaign for approval</Button>`,
`<Button type="submit" disabled={submittingCampaign || !form.title.trim() || !form.description.trim()}><CheckCircle2 size={18} /> {submittingCampaign ? 'Submitting...' : 'Submit campaign for approval'}</Button>`
);

fs.writeFileSync(file, code);
console.log("? Wizard submit flow fixed.");
