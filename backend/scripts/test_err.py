import urllib.request
from urllib.error import HTTPError

try:
    html = urllib.request.urlopen('http://localhost:8000/api/dashboard/?module=vehicle-assets').read().decode('utf-8')
except HTTPError as e:
    html = e.read().decode('utf-8')

for line in html.split('\n'):
    if 'Exception Value:' in line or 'AttributeError' in line:
        print(line.strip())
