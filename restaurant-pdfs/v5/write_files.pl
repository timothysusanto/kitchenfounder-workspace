#!/usr/bin/perl
use strict;
use warnings;

# Write Mediterranean Meze HTML
my $med_html = <<'HTML_END';
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Test</title></head>
<body><h1>Test</h1></body>
</html>
HTML_END

open(my $fh, '>', '/workspace/restaurant-pdfs/v5/mediterranean-meze.html') or die "Cannot open: $!";
print $fh $med_html;
close($fh);
print "Done\n";
