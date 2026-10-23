// PROVISIONAL: owner flagged BOTH business and creative processes for review.
// These inherited steps are an interaction specimen, not approved operating copy.
export type ProcessRole='client'|'creator';
export type ProcessStep={verb:string;title:string;copy:string;prompts:string[];outcome:string};
export type RoleCopy={label:string;title:string;intro:string;steps:ProcessStep[]};
// Adapted from the existing Network process; client path adds distribution.
export const roles: Record<ProcessRole,RoleCopy> = {
  creator: {
    label: "For creators",
    title: "Receive the brief. Make the work. Approve how it travels.",
    intro:
      "Every opportunity arrives with the creative ask, deliverables and commercial terms. You choose the work, provide what was agreed and approve the release before the client can use it.",
    steps: [
      {
        verb: "Receive",
        title: "Get the complete brief",
        copy: "See the idea, required deliverables, schedule, fee, expenses, revision limit, responsibilities and proposed usage before you commit.",
        prompts: ["Creative brief", "Deliverables", "Schedule", "Full terms"],
        outcome: "One approved brief that makes the creative and commercial ask clear.",
      },
      {
        verb: "Choose",
        title: "Accept, ask or pass",
        copy: "Review why the work reached you, ask what needs resolving and accept only when the same versioned terms work for both sides.",
        prompts: ["Reason for fit", "Questions", "Versioned terms", "Mutual acceptance"],
        outcome: "An informed agreement without speculative work or a public rejection.",
      },
      {
        verb: "Create",
        title: "Produce the agreed deliverables",
        copy: "Make and submit the assets named in the brief. Feedback and revisions stay within the accepted scope, count and approval path.",
        prompts: ["Creator-made work", "Required formats", "Delivery", "Agreed revisions"],
        outcome: "The promised deliverables, reviewed against the brief both sides accepted.",
      },
      {
        verb: "Release",
        title: "Approve how the work can be used",
        copy: "Approve a release that names the channels, territory, duration and media. It also lists every allowed edit or derivative—such as crops, cutdowns, captions, translations or adaptations.",
        prompts: ["Usage", "Licence term", "Allowed derivatives", "Likeness + AI"],
        outcome: "A precise usage licence. Anything not listed requires new written approval.",
      },
      {
        verb: "Close",
        title: "Carry the approved work forward",
        copy: "Confirm delivery, approval, payment status and licence expiry. Choose whether the finished work appears in your portfolio.",
        prompts: ["Approval", "Payment status", "Rights expiry", "Portfolio consent"],
        outcome: "A factual completion record and creator-controlled proof of the work.",
      },
    ],
  },
  client: {
    label: "For Anima clients",
    title: "Bring the brand problem. We make it ready for creators.",
    intro:
      "Clients begin with Anima. We lead the relationship, sharpen the ask and approve every brief before an introduction is made.",
    steps: [
      {
        verb: "Detect",
        title: "Start with the desired effect",
        copy: "Define the audience tension, the action the work needs to create and what the brand can credibly bring to it.",
        prompts: ["Human pull", "Brand problem", "Audience", "Desired effect"],
        outcome: "A creator assignment grounded in strategy and a clear desired effect.",
      },
      {
        verb: "Distill",
        title: "Make the brief worth choosing",
        copy: "Anima turns the objective into a focused creative territory, a clear deliverable and useful selection criteria.",
        prompts: ["Creative territory", "Deliverables", "References", "Selection criteria"],
        outcome: "One strong idea with enough direction to hold together and enough room to interpret.",
      },
      {
        verb: "Define",
        title: "Complete the deal",
        copy: "Compensation, expenses, rights, revisions, timing, responsibilities and cancellation are settled before creators see it.",
        prompts: ["Fee + expenses", "Rights", "Timing", "Responsibilities"],
        outcome: "A complete commercial brief ready for review.",
      },
      {
        verb: "Match",
        title: "Meet the reason for the fit",
        copy: "Anima introduces a considered shortlist and makes the reason visible: craft, format, availability, terms and context when it matters.",
        prompts: ["Creative approach", "Format", "Availability", "Relevant context"],
        outcome: "A considered shortlist built around craft, approach and context.",
      },
      {
        verb: "Deliver",
        title: "Carry the work through",
        copy: "Choose among interested creators, accept the same direct terms and carry the work through agreed delivery and approval.",
        prompts: ["Mutual acceptance", "Assets", "Decisions", "Closeout"],
        outcome: "A coherent path from approved idea to approved work.",
      },
      {
        verb: "Distribute",
        title: "Put the work where it matters",
        copy: "Plan the rollout around the people you want to reach: your own channels, creator collaborations, paid media and real-world activations. Publish within the agreed usage rights, then review what reaches people and what moves them to act.",
        prompts: ["Channel plan", "Launch + rollout", "Approved usage", "Audience response"],
        outcome: "Approved work reaching its intended audience, with results that inform what comes next.",
      },
    ],
  },
};
