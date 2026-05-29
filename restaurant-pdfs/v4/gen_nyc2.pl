open(my $fh, '>', '/workspace/restaurant-pdfs/v4/nyc-bodega-elevated.html') or die $!;
my $html = <<'HTML';
test content
HTML
print $fh $html;
close($fh);
print "ok\n";
