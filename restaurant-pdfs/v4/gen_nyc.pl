open(my $fh, '>', '/workspace/restaurant-pdfs/v4/nyc-bodega-elevated.html') or die $!;
print $fh "test\n";
close($fh);
print "done\n";
