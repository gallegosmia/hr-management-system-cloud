const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'app', 'payroll', '[id]', 'page.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// There are exactly two 'return-btn' after the HR finalize block for Branch and Ops
// Let's just blindly replace them based on the surrounding text
const branchBlockTarget = `Return to Branch Manager
                                                    </button>
                                                </>
                                            )}
                                        
                                        {/* Operations Manager Approve/Return */}`;

const branchBlockFix = `Return to HR
                                                    </button>
                                                </>
                                            )}
                                        
                                        {/* Operations Manager Approve/Return */}`;

const opsBlockTarget = `Return to HR
                                                    </button>
                                                </>
                                            )}

                                        {/* VP Final Approve/Return */}`;

const opsBlockFix = `Return to Branch Manager
                                                    </button>
                                                </>
                                            )}

                                        {/* VP Final Approve/Return */}`;

if (content.includes(branchBlockTarget)) {
    content = content.replace(branchBlockTarget, branchBlockFix);
}

if (content.includes(opsBlockTarget)) {
    content = content.replace(opsBlockTarget, opsBlockFix);
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log("Fixed return buttons!");
