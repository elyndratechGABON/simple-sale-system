with open('src/components/DevicePairingDialog.tsx','r') as f:
    s = f.read()
insert = '  <EmployeeInfoDialog open={infoOpen} onOpenChange={setInfoOpen} peerName={identity?.deviceId?.slice(0,8)} onSave={(info) => { setEmployeeName(`${info.firstName} ${info.lastName}`); toast.success(`Enregistre: ${info.firstName} ${info.lastName}`); void qc.invalidateQueries({queryKey:["paired_devices"]}); }} />\n'
idx = s.rfind('  );')
if idx >= 0:
    s = s[:idx] + insert + s[idx:]
with open('src/components/DevicePairingDialog.tsx','w') as f:
    f.write(s)
print('done', len(s))
