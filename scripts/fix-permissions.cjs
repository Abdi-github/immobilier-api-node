const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

// Fix permissions.json - remove duplicates
console.log('Fixing permissions.json...');
let permissions = JSON.parse(fs.readFileSync(path.join(dataDir, 'permissions.json'), 'utf8'));
const seen = new Set();
const originalCount = permissions.length;
permissions = permissions.filter(p => {
  if (seen.has(p.name)) {
    console.log(`  Removing duplicate: ${p.name} (ID: ${p._id})`);
    return false;
  }
  seen.add(p.name);
  return true;
});
fs.writeFileSync(path.join(dataDir, 'permissions.json'), JSON.stringify(permissions, null, 2));
console.log(`  Removed ${originalCount - permissions.length} duplicates`);

// Fix role_permissions.json - use correct IDs
console.log('\nFixing role_permissions.json...');
let rolePerms = JSON.parse(fs.readFileSync(path.join(dataDir, 'role_permissions.json'), 'utf8'));
const PLATFORM_ADMIN_ROLE = '695ef685f990bb64260715fa';
const REJECT_PERM_CORRECT = '695ef685f990bb6426071650';
const ARCHIVE_PERM_CORRECT = '695ef685f990bb6426071651';

// Update the permission IDs for platform_admin
let updated = 0;
rolePerms = rolePerms.map(rp => {
  if (rp.role_id === PLATFORM_ADMIN_ROLE) {
    if (rp.permission_id === '695ef685f990bb6426071657') {
      rp.permission_id = REJECT_PERM_CORRECT;
      updated++;
    }
    if (rp.permission_id === '695ef685f990bb6426071658') {
      rp.permission_id = ARCHIVE_PERM_CORRECT;
      updated++;
    }
  }
  return rp;
});
console.log(`  Updated ${updated} permission references`);

fs.writeFileSync(path.join(dataDir, 'role_permissions.json'), JSON.stringify(rolePerms, null, 2));
console.log('\nDone!');
