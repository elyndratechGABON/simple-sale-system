import re
with open('src/components/DevicePairingDialog.tsx', 'r') as f:
    s = f.read()
# Insert at end, after closing of return, closing of component
insert = '''
  <EmployeeInfoDialog
    open={infoOpen}
    onOpenChange={setInfoOpen}
    peerName={identity?.deviceId?.slice(0, 8)}
    onSave={(info) => {
      setEmployeeName(`${info.firstName} ${info.lastName}`);
      toast.success(`Enregistré : ${info.firstName} ${info.lastName}`);
      void qc.invalidateQueries({ queryKey: ["paired_devices"] });
    }}
  />
'''
# The file ends with "  </>\n);\n}" (after restoration + edit) - find last closing braces
# Just append before final closing brace of component if needed, but simpler: if missing closing tag, add
# Wait, file is broken at return; let's just restore from git again and do simple manual edit
print('len', len(s))
