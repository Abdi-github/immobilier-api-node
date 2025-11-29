const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

// ID mapping: old ID -> new ID
const idMapping = {
  '695ef685f990bb6426071650': '695ef685f990bb6426071660', // roles:read
  '695ef685f990bb6426071651': '695ef685f990bb6426071661', // roles:create
  '695ef685f990bb6426071652': '695ef685f990bb6426071662', // roles:delete
  '695ef685f990bb6426071653': '695ef685f990bb6426071663', // roles:manage
  '695ef685f990bb6426071654': '695ef685f990bb6426071664', // permissions:read
  '695ef685f990bb6426071655': '695ef685f990bb6426071665', // permissions:manage
  '695ef685f990bb6426071656': '695ef685f990bb6426071666', // * (wildcard)
};

// Fix permissions.json
console.log('Fixing permissions.json...');
let permissions = JSON.parse(fs.readFileSync(path.join(dataDir, 'permissions.json'), 'utf8'));

permissions = permissions.map(p => {
  // Only remap for roles:*, permissions:*, and wildcard
  if (p.name.startsWith('roles:') || p.name.startsWith('permissions:') || p.name === '*') {
    const newId = idMapping[p._id];
    if (newId) {
      console.log(`  Remapping ${p.name}: ${p._id} -> ${newId}`);
      p._id = newId;
    }
  }
  return p;
});

fs.writeFileSync(path.join(dataDir, 'permissions.json'), JSON.stringify(permissions, null, 2));
console.log('  Done fixing permissions.json');

// Fix role_permissions.json
console.log('\nFixing role_permissions.json...');
let rolePerms = JSON.parse(fs.readFileSync(path.join(dataDir, 'role_permissions.json'), 'utf8'));

rolePerms = rolePerms.map(rp => {
  const newId = idMapping[rp.permission_id];
  if (newId) {
    console.log(`  Remapping role_permission: ${rp.permission_id} -> ${newId}`);
    rp.permission_id = newId;
  }
  return rp;
});

fs.writeFileSync(path.join(dataDir, 'role_permissions.json'), JSON.stringify(rolePerms, null, 2));
console.log('  Done fixing role_permissions.json');

// Verify no duplicates remain
console.log('\nVerifying no duplicate IDs...');
const ids = permissions.map(p => p._id);
const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
if (duplicates.length > 0) {
  console.error('ERROR: Still have duplicates:', duplicates);
  process.exit(1);
} else {
  console.log('  No duplicate IDs found!');
}

console.log('\nDone!');
