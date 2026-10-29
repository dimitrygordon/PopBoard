# Circuit Builder: science notes

Status: TODO-TESLA. Nothing below has Tesla's sign-off yet. Art is marked PENDING TESLA CHECK in its MANIFEST.

## The solver
- The circuit is solved with nodal analysis: Kirchhoff's current law at every node (current in = current out), with Ohm's law (I = V / R) for every part. The node voltages come from one linear system, G v = J, solved by Gaussian elimination. TODO-TESLA
- Every lead is its own node. Wires and closed switches are 0.001 Ω resistors rather than perfect joins, so the current in each wire can be read off and drawn. TODO-TESLA
- A tiny leak (10⁻⁹ siemens) joins every node to a reference, so a floating or open part of the circuit still has a solution (it simply carries no current). TODO-TESLA
- Each battery is an ideal voltage source with a 0.1 Ω internal resistance, solved as its Norton equivalent. This keeps a short circuit finite: a wire straight across a 6 V battery gives about 60 A. TODO-TESLA

## Parts
- Battery: 1.5 V to 9 V in 1.5 V steps (one to six cells). The + end is on the right, shown in the art only by the raised nub. TODO-TESLA
- Bulb: a fixed 10 Ω resistor. Real filaments are not ohmic (their resistance rises several times as they heat), so real series bulbs are brighter than this model shows. TODO-TESLA
- Bulb glow follows power: glow = √(P / 3.6 W), where 3.6 W is one bulb straight across 6 V. Two bulbs in series on 6 V each get a quarter of the power and glow at half; two in parallel each glow fully. TODO-TESLA
- Resistor: 1 Ω to 100 Ω. The bands on the art stay gray on purpose and do not follow the color code; the value is shown as live text (Leo). TODO-TESLA
- Switch: on is a wire, off is a gap (no element). An open switch has the full battery voltage across it in a simple loop. TODO-TESLA

## Meters
- Ammeter: 0.01 Ω, read in series (in the loop). Put across a battery it is a short circuit, which is the classic mistake, and the board says so. TODO-TESLA
- Voltmeter: 1 MΩ, read in parallel (across a part). Dropped into the loop instead, it lets almost no current through (about 6 µA on 6 V), so the bulbs go dark and the board explains why. The Clip voltmeter button attaches its two leads across the selected part (Leo). TODO-TESLA
- Needles move on critically damped springs. Full scale is 10 V and 1 A; the live text under the dial gives the exact reading, which can pass full scale. TODO-TESLA
- Readings are magnitudes; the meters do not show a negative sign when connected backwards. TODO-TESLA

## Shorts and open circuits
- A short is flagged when a battery drives more than V / (0.1 Ω + 0.5 Ω), meaning less than 0.5 Ω outside the battery. The warning is calm text in the readout and a dashed ring round the battery, with no flashing. TODO-TESLA
- Open circuit: no battery current above 1 mA. TODO-TESLA

## Current dots
- Dots show conventional current, flowing out of the + end of the battery round to the other end. Electrons actually drift the other way. TODO-TESLA
- Dot speed grows with the square root of the current and is capped, so a short looks calm. Real electron drift is far slower (fractions of a millimetre per second). TODO-TESLA

## Series and parallel
- Series: both bulbs carry the battery's whole current. Parallel: their currents add up to the battery's current and each has the same voltage. Detection uses a 2% tolerance and needs exactly one battery and two lit bulbs (glow at least 0.2). TODO-TESLA
