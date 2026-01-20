"""List ClubGG processes."""
import subprocess
result = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq ClubGG*'], capture_output=True, text=True)
print(result.stdout)

result2 = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq launcher*'], capture_output=True, text=True)
print(result2.stdout)
