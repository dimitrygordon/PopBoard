#!/bin/bash
# Master renders: disc R = 1024 px (2,048 px across), layer A covers +-1.32 R (2704 px), halo layer B +-2.0 R (512 px).
SRC=${1:-/workspace/vr-stellar/round12/gen/src}; OUT=${2:-/workspace/vr-stellar/round12/masters}; B=$(dirname "$0")/bake.py
mkdir -p $OUT
python3 $(dirname "$0")/patch_bake.py $SRC
KF=2.6947368; KR=3.4133333; BF=0.3368421; BR=0.4266667; port=18990
for v in 0 1 2; do
  BAKE_PORT=$((port++)) python3 $B $SRC $OUT f3a A $v 2704 $KF &
  BAKE_PORT=$((port++)) python3 $B $SRC $OUT rg A $v 2704 $KR &
done
BAKE_PORT=$((port++)) python3 $B $SRC $OUT f3a B 0 512 $BF &
BAKE_PORT=$((port++)) python3 $B $SRC $OUT rg B 0 512 $BR &
wait; ls -la $OUT
