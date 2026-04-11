---
layout: post
title: "Bash script for generating post files"
date: 2026-03-16
---

The .md file for this post was created using a script supplied by the esteemed torchedplatypi.

> #!/bin/bash
datestamp=$(date +%Y-%m-%d)
filename=$(echo "$1" | tr ' ' '-')
postname="_posts/$datestamp-$filename.md"
cat << EOF > $postname
---
layout: post
title: "$1"
date: $datestamp
---
EOF
nvim $postname